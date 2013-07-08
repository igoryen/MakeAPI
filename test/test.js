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
    
  // for POSTed call parameters

  it('should error if call parameters are erroneously present', function(done){
    done();
  });
  
  
  // POSTed expected info

  it ('should error if mimimum fields are not passed', function(done){
    done();
  });
  
  it('should create a new Make if minimum fields are passed', function (done){   
    done();
  });
  
  
  it('should create a new Make if minimum fields + email are passed', function (done){
    done();
  });
  
  
  it('should create a new Make if minimum fields + url are passed', function (done){
    done();
  });
  
  it('should create a new Make if minimum fields + url + email are passed', function (done){
    done();
  });
  
  
  // for POSTed url
  
  it('should error if url is not present', function (done){

    done();
  });
  
  
  it('should error if url is not a string', function (done){

    done();
  });
  
  
  it('should error if url is not a valid URL', function (done){

    done();
  });

  // for POSTed content type
  
  
  it('should error if contentType is not present', function (done){

    done();
  });
  
  it('should error if contentType is not STRING', function (done){

    done();
  });
  
  it('should error if contentType is not recognized', function (done){

    done();
  });
  
  // for POSTed title 
  
  it('should error if title is not present', function (done){

    done();
  });
  
  it('should error if title is not a STRING', function (done){

    done();
  });
  
  it('should error if title contains a bad word', function (done){

    done();
  });

  it( 'should error when title contains the illegal character', function( done ) {
    done();
  });

  // for POSTed email
  
  it('should error if email is not present', function (done){

    var retVal = callServer({
     url: "www.blah.com",
     contentType: "text/plaintext",
     title: "blah"
   } );

    assert.equal( retVal.hasOwnProperty(error:, true )

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

  // for return to POSTed data


  it('should error if the return is not present', function (done){ 
    done();
  });
  
  it('should ... if the return is an error object', function (done){

    done();
  });
  
  it('should ... if the return is an object with the email property', function (done){

    done();
  });
  
  it('should ... if the return is an object with the title property', function (done){

    done();
  });
  
  // returned email
  
  it('should error if the return`s email property is NOT present', function (done){
    done();
  });
  
  it('should error if the return`s email property is NOT a STRING', function (done){
    done();
  });

  it('should error if the return`s email property contains a bad word', function (done){
    done();
  });

  it('should error if the return`s email property is of wrong format', function (done){
    done();
  });

  it('should error if the return`s email property is too long (> ... chars)', function (done){
    done();
  });
  
  //returned title
  
  it('should error if the return`s title is not present', function (done){

    done();
  });
  
  it('should error if the the return`s title is not a STRING', function (done){
    done();
  });

  it('should error if the return`s title contains a bad word', function (done){
    done();
  });

  it('should error if the return`s title is too long (> ... chars)', function (done){
    done();
  });


  it('should error if the return`s title is too short (< 1 chars)', function (done){ // ?
    done();
  });

  it( 'should error if the return`s title contains illegal characters', function( done ) {
    done();
  });
  
  // for PUTed data
  
  describe('PUT /api/make/:id', function(){

    // call parameter is id:
    
    it('should update a Make if id has been passed', function(done){
      done();
    });
    
    it('should error if id is not present', function(done){
      done();
    });
    
    it('should error if id format is wrong', function(done){
      done();
    });

    // expected info is maker and make:
    
    it('should update a Make if maker and make have been passed', function(done){
      done();
    });
    
    it('should err if make and maker have not been passed', function(done){
      done();
    });
    
    // make`s conditions 
    
    it('should error if maker is not present', function(done){
      done();
    });
    
    it('should error if maker is not a STRING', function(done){
      done();
    });

    it('should error if maker contains a bad word', function(done){
      done();
    });

    it('should error if maker is too long (> ... chars)', function(done){
      done();
    });
    
    it('should error if maker is too short (< ... chars)', function(done){
      done();
    });
    
    it( 'should error if the return`s maker contains illegal characters', function( done ) {
      done();
    }); 

    it('should update a Make if make is present', function(done){
        done();
    });
      
  });
  
  // for data in DELETE req 
  describe('DELETE /api/make/:id', function(){

    // call parameter 

    it('should delete a Make if id is present', function(done){
      done();
    }); 

    
    it('should error if id is not present', function(done){
      done();
    });


    // expected info

    it('should error if data is erroneously received', function(done){
      done();
    });

    // return

    it('should delete a Make if an error object has email and title:', function(done){
      done();
    });


    // return's email
    it('should error if email is not present', function (done){
      done();
    });

    it('should error if email is not a STRING', function (done){
      done();
    });
    

    it('should error if email contains a bad word', function (done){
      done();
    });

    it('should error if email format is not valid', function (done){
      done();
    });

    it('should error if email is too long (> ... chars)', function (done){
      done();
    });
    
    // return's title

    it('should error if title is not present', function (done){
      done();
    });

    it('should error if title is not a STRING', function (done){
      done();
    });


    it('should error if title contains a bad word', function (done){
      done();
    });

    it('should error if title is too long (>... chars)', function (done){
      done();
    });

    it('should error if title is too short (< ... chars)', function (done){
      done();
    });

    it( 'should error if the return`s title contains illegal characters', function( done ) {
       done();   
    }); // end of illegalChars.forEach()

  });