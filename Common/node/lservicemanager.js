var fs = require("fs");
var path = require("path");
var lconfig = require("lconfig");
var crypto = require("crypto");
var spawn = require('child_process').spawn;

var serviceMap = {
    available:[],
    installed:{}
};

var shuttingDown = null;
var lockerPortNext = parseInt("1" + lconfig.lockerPort, 10);

exports.serviceMap = function() {
    // XXX Sterilize?
    return serviceMap;
}

/**
* Map a meta data file JSON with a few more fields and make it available
*/
function mapMetaData(file, type) {
    var metaData = JSON.parse(fs.readFileSync(file, 'utf-8'));
    metaData.srcdir = path.dirname(file);
    metaData.is = type;
    serviceMap["available"].push(metaData);
    return metaData;
}
    
/**
* The types of services that are currently understood
*/
var scannedTypes = ["collection", "connector", "app"];

/**
* Scans a directory for available services
*/
exports.scanDirectory = function(dir) {
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var fullPath = dir + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(stats.isDirectory()) {
            exports.scanDirectory(fullPath);
            continue;
        }
        scannedTypes.forEach(function(scanType) {
            if (RegExp("\\." + scanType + "$").test(fullPath)) {
                mapMetaData(fullPath, scanType);
            }
        });
    }
}

/**
* Scans the Me directory for instaled services
*/
exports.findInstalled = function () {
    var dirs = fs.readdirSync('Me');
    for (var i = 0; i < dirs.length; i++) {
        var dir =  'Me/' + dirs[i];
        if(!fs.statSync(dir).isDirectory()) continue;
        if(!fs.statSync(dir+'/me.json').isFile()) continue;
        var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf-8'));
        console.log("Installing " + js.id);
        serviceMap.installed[js.id] = js;
    }
}

/**
* Install a service
*/
exports.install = function(metaData) {
    var hash = crypto.createHash('md5');
    hash.update(Math.random()+'');
    metaData.id = hash.digest('hex');
    metaData.me = lconfig.lockerDir+'/Me/'+metaData.id;
    metaData.uri = lconfig.lockerBase+"Me/"+metaData.id+"/";
    serviceMap.installed[metaData.id] = metaData;
    fs.mkdirSync(metaData.me,0755);
    fs.writeFileSync(metaData.me+'/me.json',JSON.stringify(metaData));

    return metaData;
}

//! Spawn a service instance
/**
* \param svc The service description to start
* \param callback Completion callback
*
* The service will be spanwed as described in its configuration file.  The service can
* read its environment description from stdin which will consist of one JSON object.  The
* object will have a mandatory port and workingDirectory field, but the rest is optional.
* \code
*   {
*     port:18044,
*     workingDirectory:"/some/path/"
*   }
* \endcode
* Once the service has completed its startup it will write out to stdout a single JSON object
* with the used port and any other environment information.  The port must be the actual
* port the service is listening on.
* \code
*   {
*     port:18044
*   }
* \encode
*/
exports.spawn = function(serviceId, callback) {
    var svc = exports.metaInfo(serviceId);
    // Already running
    if (svc.pid) return;
    var run = svc.run.split(" "); // node foo.js

    svc.port = ++lockerPortNext;
    var processInformation = {
        port: svc.port, // This is just a suggested port
        workingDirectory: svc.me, // A path into the me directory
        lockerUrl:lconfig.lockerBase
    };
    app = spawn(run.shift(), run, {cwd: svc.srcdir});
    app.stderr.on('data', function (data) {
        var mod = console.outputModule
        console.outputModule = svc.title
        console.error(data);
        console.outputModule = mod
    });
    app.stdout.on('data',function (data) {
        var mod = console.outputModule
        console.outputModule = svc.title
        if (svc.pid) {
            // We're already running so just log it for them
            console.log(data);
        } else {
            // Process the startup json info
            try {
                var returnedProcessInformation = JSON.parse(data);

                svc.pid = app.pid;
                if(returnedProcessInformation.port) svc.port = returnedProcessInformation.port; // if they tell us a port, use that
                svc.uriLocal = "http://localhost:"+svc.port+"/";
                fs.writeFileSync(svc.me+'/me.json',JSON.stringify(svc)); // save out all updated meta fields
                if (callback) callback();
            } catch(error) {
                console.error("The process did not return valid startup information. "+error);
                app.kill();
            }
        }
        console.outputModule = mod;
        
    });
    app.on('exit', function (code) {
        delete svc.pid;
        fs.writeFileSync(svc.me+'/me.json',JSON.stringify(svc)); // save out all updated meta fields
        checkForShutdown();
    });
    app.stdin.write(JSON.stringify(processInformation)+"\n"); // Send them the process information
}

/**
* Retrieve the meta information for a service
*/
exports.metaInfo = function(serviceId) {
    return serviceMap.installed[serviceId];
}

exports.isInstalled = function(serviceId) {
    return serviceId in serviceMap.installed;
}

/**
* Shutdown all running services
*
* \param cb Callback to call when the shutdown is complete
*/
exports.shutdown = function(cb) {
    shuttingDown = cb;
    for(var mapEntry in serviceMap.installed) {
        var svc = serviceMap.installed[mapEntry];
        if (svc.pid) {
            try {
                process.kill(svc.pid);
            } catch(e) {
            }
        }
    }
    checkForShutdown();
}

/**
* Return whether the service is running
*/
exports.isRunning = function(serviceId) {
    return exports.isInstalled(serviceId) && exports.metaInfo(serviceId).pid
}

function checkForShutdown() {
    if (!shuttingDown) return;
    for(var mapEntry in serviceMap.installed) {
        var svc = serviceMap.installed[mapEntry];
        if (svc.pid)  return;
    }
    shuttingDown();
    shuttingDown = null;
}
