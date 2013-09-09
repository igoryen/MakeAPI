/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// New Relic Server monitoring support
if ( process.env.NEW_RELIC_ENABLED ) {
  require( "newrelic" );
}

// Bring in all your require modules
var express = require( "express" ),
    habitat = require( "habitat" ),
    helmet = require( "helmet" ),
    nunjucks = require( "nunjucks" ),
    path = require( "path" );

// Load config from ".env"
habitat.load();

// Generate app variables
var app = express(),
    env = new habitat(),
    Mongo = require( "./lib/mongoose" )( env ),
    Make = require( "./lib/models/make" )( env, Mongo.mongoInstance() ),
    ApiUser = require( "./lib/models/apiUser" )( env, Mongo.mongoInstance() ),
    nunjucksEnv = new nunjucks.Environment( new nunjucks.FileSystemLoader( path.join( __dirname + "/views" ) ), { autoescape: true } ),
    csrfMiddleware = express.csrf(),
    server;

// Enable template rendering with nunjucks
nunjucksEnv.express( app );
// Don't send the "X-Powered-By: Express" header
app.disable( "x-powered-by" );

// Setup butler, with host (graylog2 host) and facility (e.g., app name in loggins)
var butler = require( "webmaker-butler" )({
  host: env.get( "GRAYLOG_HOST" ) || "dev-no-host",
  facility: env.get( "GRAYLOG_FACILITY" ) || "makeapi",
  onCrash: function( err, req, res ) {
    server.close();
    res.statusCode = 500;
    res.json( err );
  }
});
app.use( butler.middleware );

app.use(express.favicon("public/images/favicon.ico", {
  maxAge: 31556952000
}));

if ( !!env.get( "FORCE_SSL" ) ) {
  app.use( helmet.hsts() );
  app.enable( "trust proxy" );
}
app.use( express.compress() );
app.use( express.static( path.join( __dirname + "/public" ) ) );
app.use( express.json() );
app.use( express.urlencoded() );
app.use( express.cookieParser() );
app.use( express.cookieSession({
  key: "makeapi.sid",
  secret: env.get( "SESSION_SECRET" ),
  cookie: {
    maxAge: 2678400000, // 31 days. Persona saves session data for 1 month
    secure: !!env.get( "FORCE_SSL" )
  },
  proxy: true
}));

if ( env.get( "GRAYLOG_HOST" ) && env.get( "GRAYLOG_PORT" ) ) {
  app.use( require( "./lib/logger" ).logRequests );
} else {
  app.use( express.logger( env.get( "NODE_ENV" ) === "production" ? "" : "dev" ) );
}

app.use( app.router );

require( "./lib/loginapi" )( app, {
  loginURL: env.get( "LOGIN_SERVER_URL_WITH_AUTH" ),
  audience: env.get( "AUDIENCE" ),
  middleware: csrfMiddleware,
  verifyResponse: function( res, data ) {
    if ( !data.user.isAdmin && !data.user.isCollaborator ) {
      return res.json({ status: "failure", reason: "You are not authorised to view this page." });
    }
    res.json({ status: "okay", email: data.user.email });
  }
});

var routes = require( "./routes" )( Make, ApiUser, env ),
    middleware = require( "./lib/middleware" )( Make, ApiUser, env );

// Handle 500s, reporting back to graylog via butler
app.use( function( err, req, res, next ) {
  if ( !err.status ) {
    err.status = 500;
  }

  butler.reportError( err );
  res.status( err.status );
  res.json( err );
});
app.use( middleware.fourOhFourHandler );

function corsOptions ( req, res ) {
  res.header( "Access-Control-Allow-Origin", "*" );
  res.header( "Access-Control-Allow-Headers", "Content-Type" );
  res.send( 200 );
}

app.options( "/api/20130724/make/search", corsOptions );

// 20130724 API Routes (Hawk Authentication)
app.post( "/api/20130724/make", middleware.hawkAuth, Mongo.isDbOnline, middleware.prefixAuth, routes.create );
app.put( "/api/20130724/make/:id", middleware.hawkAuth, Mongo.isDbOnline, middleware.getMake, middleware.prefixAuth, routes.update );
app.put( "/api/20130724/make/like/:id", middleware.hawkAuth, Mongo.isDbOnline, middleware.getMake, middleware.like, routes.update );
app.put( "/api/20130724/make/unlike/:id", middleware.hawkAuth, Mongo.isDbOnline, middleware.getMake, middleware.unlike, routes.update );
app.del( "/api/20130724/make/:id", middleware.hawkAuth, Mongo.isDbOnline, middleware.getMake, routes.remove );
app.get( "/api/20130724/make/search", Mongo.isDbOnline, middleware.crossOrigin, routes.search );

// 20130724 Admin API routes
app.put( "/admin/api/20130724/make/:id", csrfMiddleware, middleware.collabAuth, middleware.fieldFilter, Mongo.isDbOnline, middleware.getMake, routes.update );
app.del( "/admin/api/20130724/make/:id", csrfMiddleware, middleware.adminAuth, Mongo.isDbOnline, middleware.getMake, routes.remove );
app.get( "/admin/api/20130724/make/search", Mongo.isDbOnline, routes.search );

// Routes relating to admin tools
app.get( "/login", csrfMiddleware, routes.login );
app.get( "/admin", csrfMiddleware, middleware.collabAuth, routes.admin );

// Admin tool path for generating Hawk Keys
app.post( "/admin/api/user", csrfMiddleware, middleware.adminAuth, Mongo.isDbOnline, routes.addUser );

// Serve makeapi-client.js over http
app.get( "/js/make-api.js", function( req, res ) {
  res.sendfile( path.resolve( __dirname, "node_modules/makeapi-client/src/make-api.js" ) );
});

app.get( "/healthcheck", routes.healthcheck );

if ( env.get( "NODE_ENV" ) !== "production" ) {
  app.get( "/search.html", routes.searchTest );
}

server = app.listen( env.get( "PORT", 3000 ), function() {
  console.log( "MakeAPI server listening ( Probably http://localhost:%d )", env.get( "PORT", 3000 ));
});
