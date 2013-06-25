var assert = require( 'assert' ),
    fork = require( 'child_process' ).fork,
    request = require( 'request' ),
    MakeAPI = require( '../public/js/make-api.js' ),
    now = Date.now(),
    child,
    loginChild,
    port = 3000,
    hostAuth = 'http://travis:travis@localhost:' + port,
    hostNoAuth = 'http://localhost:' + port,
    illegalChars = "` ! @ # $ % ^ & * ( ) + = ; : ' \" , < . > / ?".split( " " );

    // One admin user, one non-admin
    admin = {
      email: "admin@webfaker.org",
      username: "admin",
      fullName: "An Admin",
      isAdmin: true },
    notAdmin = {
      email: "notadmin@webfaker.org",
      username: "notadmin",
      fullName: "Not Admin",
      isAdmin: false,
    };


    // Adding a space to the illegalChars list
    illegalChars.push(" ");

/**
 * Server functions
 */
function startLoginServer( done ) {
  var loginPort = 3001;

  function createUser( user, callback ) {
    request({
      url: "http://localhost:" + loginPort + "/user",
      method: 'post',
      json: user
    }, function( err, res, body ) {
      assert.ok( !err );
      assert.equal( res.statusCode, 200 );
      callback();
    });
  }

  loginChild = fork( 'test/login.webmaker.org/app.js', [], { env: {
    PORT: loginPort,
    HOSTNAME: "http://localhost",
    MONGO_URL: "mongodb://localhost:27017/local_webmakers",
    SESSION_SECRET: "secret",
    ALLOWED_USERS: "travis:travis",
    ALLOWED_DOMAINS: "http://localhost:3000 http://localhost:3001"
  }});

  loginChild.on( "message", function( msg ) {
    if( msg === "Started" ) {
      // Create a few logins
      createUser( admin, function() {
        createUser( notAdmin, done );
      });
    }
  });
}

function startServer( done ) {
  startLoginServer( function() {
    // Spin-up the MakeAPI server as a child process
    child = fork( 'server.js', null, {} );
    child.on( 'message', function( msg ) {
      if ( msg === 'Started' ) {
        done();
      }
    });
  });
}

function stopServer( done ) {
  loginChild.kill();
  child.kill();
  done();
}

/**
 * Api functions
 */

function apiHelper( verb, uri, httpCode, data, callback, assertions ) {
  // Parameter handling
  if ( typeof( data ) === "function" ) {
    callback = data;
    data = {};
  } else {
    data = data || {};
  }
  callback = callback || function(){};
  assertions = assertions || function ( err, res, body, callback ) {
    assert.ok( !err );
    assert.equal( res.statusCode, httpCode );
    callback( err, res, body );
  };

  request({
    url: uri,
    method: verb,
    json: data
  }, function( err, res, body ) {
    assertions( err, res, body, callback );
  });
}

/**
 * User functions
 */

function unique( options ) {
  options = options || {};
  var u = ( ++now ).toString( 36 ),
      user = options.user || admin,
      url = 'http://' + user.username + '.makes.org/' + u;

  return {
    maker: user.email,
    make: {
      url: url,
      locale: options.locale || "en_US",
      contentType: options.contentType || 'text/html',
      title: options.title || u,
      description: options.description || u,
      thumbnail: options.thumbnail || url + "/thumbnail.png",
      author: options.author || user.fullName,
      email: options.email || user.email,
      tags: options.tags,
      remixedFrom: options.remixedFrom
    }
  };
}

/**
 * Unit tests
 */

describe( 'POST /api/make (create)', function() {

  var api = hostAuth + '/api/make';

  before( function( done ) {
    startServer( done );
  });

  after( function( done ) {
    stopServer( done );
  });

  it( 'should create a new make', function( done ) {
    var m = unique();

    apiHelper( 'post', api, 200, m, function( err, res, body ) {
      // Simple test, needs to be expanded for other properties we expect
      assert.equal( body.url, m.make.url );
      done();
    });
  });


  it( 'make-api.js - id', function( done ) {
    var m = unique();

    apiHelper( 'post', api, 200, m, function( err, res, body ) {
      var make = MakeAPI({ apiURL: hostNoAuth, auth: "travis:travis" });

      console.log("body", body);

      make.id( body.id ).then( function( err, data ) {

        console.log("data", data);

        assert.ok( !err );
        assert.ok( !!data );
        assert.equal( data[ 0 ].id, body.id );
        done();
      });
    });
  });


  it( 'make-api.js - url', function( done ) {
    var m = unique();

    apiHelper( 'post', api, 200, m, function( err, res, body ) {
      var make = MakeAPI({ apiURL: hostNoAuth });

      console.log("body", body);

      make.url( m.make.url ).then( function( err, data ) {

        console.log("data", data);

        assert.ok( !err );
        assert.ok( !!data );
        assert.equal( data[ 0 ].url, m.make.url );
        done();
      });
    });
  });

// expected info

  it('should create a new Make if (name:, id:) are passed', function (done){

    done();
  });


  it('should create a new Make if (name:, id:, email:) are passed', function (done){

    done();
  });


  it('should create a new Make if (name:, id:, url:) are passed', function (done){

    done();
  });

  it('should create a new Make if (name:, id:, email, url:) are passed', function (done){

    done();
  });



  it('should error if expected info is NOT received', function (done){

    done();
  });







// url

  it('should error if url is not present', function (done){

    done();
  });


  it('should error if url is not a string', function (done){

    done();
  });


  it('should error if url is not a valid URL', function (done){

    done();
  });

// content type


  it('should error if contentType value is not present', function (done){

    done();
  });

  it('should error if contentType is not STRING', function (done){

    done();
  });

  it('should error if contentType is not recognized', function (done){

    done();
  });


// title 

  it('should error if title is not present', function (done){

    done();
  });

  it('should error if title is not STRING', function (done){

    done();
  });

  it('should error if title contains a bad word', function (done){

    done();
  });


  it('should error if title is longer than X chars', function (done){

    done();
  });

    it('should error if title is shorter than X chars', function (done){

    done();
  });

  // Test title for 404 on illegal characters
  illegalChars.forEach( function( badString ) { //?
    it( 'should error when title contains the illegal character "' + badString + '"', function( done ) {
      var user = unique();
      user.username = badString;

      apiHelper( 'post', api, 404, user, done );
    });
  });









// email

  it('should error if email is not present', function (done){

    done();
  });

  it('should error if email is not STRING', function (done){

    done();
  });

  it('should error if email contains a bad word', function (done){

    done();
  });


  it('should error if email format is not valid', function (done){

    done();
  });
  
  // Return

  it('should (do what?) if the retval is correctly an error object', function (done){

    done();
  });

  it('should (do what?) if the retval is an object that has all the properties of the Make', function (done){

    done();
  });

  it('should error if the retval is NOT an object that has all properties of the Make', function (done){

    done();
  });

  it('should error if the retval is null', function (done){

    done();
  });


// returned email

  it('should error if the retval object`s email is not present', function (done){

    done();
  });

  it('should error if the retval object`s email is not STRING', function (done){

    done();
  });

  it('should error if  the retval object`s email contains a bad word', function (done){

    done();
  });


  it('should error if  the retval object`s email format is not valid', function (done){

    done();
  });

  //returned title

  it('should error if the retval object`s title is not present', function (done){

    done();
  });

  it('should error if the retval object has more than 2 attributes', function (done){

    done();
  });

  it('should error if the retval object`s title is not STRING', function (done){

    done();
  });

  it('should error if the retval object`s title contains a bad word', function (done){

    done();
  });


  it('should error if the retval object`s title is too long', function (done){

    done();
  });

    it('should error if the retval object`s title is too short', function (done){

    done();
  });


  it('should error if the retval object`s title is an unacceptable character', function (done){

    done();
  });

});




describe('PUT /api/make/:id', function(){

// 
  it('should update a Make if all the expected info is received', function(done){

    done();
  });

  it('should err if the expected into is not received', function(done){

    done();
  });


  it('should error if expected maker type is not STRING', function(done){

    done();
    
  });

  // why sad day
  it('', function(done){

    done();
    
  });
});



describe('DELETE /api/make/:id', function(){

// happy day
  it('should return an object with all the properties of the Make', function(done){

    done();

  });

  // why happy day
  it('', function (done){

    done();

  });


  // sad day
  it('', function (done){

    done();
    
  });

  // why sad day
  it('', function (done){

    done();
    
  });
});
