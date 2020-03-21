/* jshint -W097 */// jshint strict:false
/*jslint node: true */

var LifxClient=require('lifx-lan-client').Client;
var util = require('util');
var client = new LifxClient();

"use strict";

// you have to require the utils module and call adapter function
const utils =  require('@iobroker/adapter-core'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
let adapter;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'lifx',
        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: function (callback) {
            try {
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
        },
        // is called if a subscribed object changes
        objectChange: function (id, obj) {
            // Warning, obj can be null if it was deleted
             adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
        },
        // is called if a subscribed state changes
        stateChange: function (id, state) {
            // Warning, state can be null if it was deleted
            adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
        
            // you can use the ack flag to detect if it is status (true) or command (false)
            if (state && !state.ack) {
                adapter.log.debug('ack is not set! -> command');
                var tmp = id.split('.');
                var dp = tmp.pop();
                var idx = tmp.pop();
                id = idx.replace(/Bulb_/g,''); //Bulb
                adapter.log.debug('ID: '+ id + 'identified');
        
                if (dp == 'state') {
                    if (state.val == 0) {
                        client.light(id).off(0, function(err) {
                            if (err) {
                                adapter.log.debug('Turning light ' + id  + ' off failed');
                            }
                            adapter.log.debug('Turned light ' + id + ' off');
                        });
                    }
                    else if (state.val == 1) {
                        client.light(id).on(0, function(err) {
                            if (err) {
                                adapter.log.debug('Turning light ' + id  + ' on failed');
                            }
                            adapter.log.debug('Turned light ' + id + ' on');
                        });
        
                    }
                }
                if (dp == 'temp') {
                    adapter.getState('Bulb_'+id+'.bright', function(err,obj){
                        client.light(id).color(0, 0, obj.val, state.val,0, function(err) { //hue, sat, bright, kelvin,duration
                            if (err) {
                                adapter.log.debug('White light adjust' + id  + ' failed');
                            }
                            adapter.log.debug('White light adjust ' + id + ' to: ' + state.val + ' Kelvin');
                        });
        
                    });
        
                }
        
                if (dp == 'bright') {
                    adapter.getState('Bulb_' + id + '.colormode', function (err, mode) {
                        if (mode.val === 'white') {
                            adapter.getState('Bulb_' + id + '.temp', function (err, obj) {
                                client.light(id).color(0, 0, state.val, obj.val, 0, function (err) { //hue, sat, bright, kelvin
                                    if (err) {
                                        adapter.log.debug('Brightness White adjust ' + id + ' failed');
                                    }
                                    adapter.log.debug('Brightness White adjust ' + id + ' to' + state.val + ' %');
                                });
        
                            });
                        }
                        else {
        
                            adapter.getState('Bulb_' + id + '.hue', function (err, obj) {
                                client.light(id).color(obj.val, 80, state.val, 80, 0, function (err) { //hue, sat, bright, kelvin
                                    if (err) {
                                        adapter.log.debug('Brightness Color adjust ' + id + ' failed');
                                    }
                                    adapter.log.debug('Brightness Color adjust ' + id + ' to' + state.val + ' %');
                                });
                            });
        
                        }
                    });
                }
        
                if (dp == 'hue') {
                    adapter.getState('Bulb_' + id + '.sat', function (err, obj) {
                        client.light(id).color(state.val, obj.val, 80, 3500, 0, function (err) { //hue, sat, bright, kelvin
                            if (err) {
                                adapter.log.debug('Coloring light ' + id + ' failed');
                            }
                            adapter.log.debug('Coloring light ' + id + ' to: ' + state.val + ' °');
                        });
        
                    });
                }
        
        
        
                if (dp == 'sat') {
                        adapter.getState('Bulb_'+id+'.hue', function(err,obj){
                            client.light(id).color(obj.val, state.val, 80, 3500, 0, function(err) { //hue, sat, bright, kelvin
                                if (err) {
                                    adapter.log.debug('Saturation light ' + id  + ' failed');
                                }
                                adapter.log.debug('Saturation light ' + id + ' to: '+ state.val+' %');
                            });
        
                        });
        
                }
        
            }
        },
        // is called when databases are connected and adapter received configuration.
        // start here!
        ready: () => {
                  main()
            }

    });
    adapter = new utils.Adapter(options);
    
    return adapter;
};

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    
    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
    client.on('light-new', function(light) {
        adapter.log.info('New light found.');
        adapter.log.info('ID: ' + light.id);
        adapter.log.info('IP: ' + light.address + ':' + light.port);
        adapter.setObject('Bulb_' + light.id, {
            type: 'channel',
            common: {
                name: 'LifxBulb ' + light.id,
                role: 'light.color.rgbw'
            },
            native: {
                "add": light.address
            }
        });
        adapter.setObject('Bulb_' + light.id + '.label',
            {
                "type": "state",
                "common": {
                    "name":  "Label",
                    "type":  "string",
                    "role":  "info.name",
                    "read":  true,
                    "write": false,
                    "desc":  "Label",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + light.id + '.vendor',
            {
                "type": "state",
                "common": {
                    "name":  "Vendor",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "Vendor",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + light.id + '.product',
            {
                "type": "state",
                "common": {
                    "name":  "Product",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "product",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + light.id + '.version',
            {
                "type": "state",
                "common": {
                    "name":  "Version",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "Version",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + light.id + '.colorLamp',
            {
                "type": "state",
                "common": {
                    "name":  "color lamp",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "color Lamp",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + light.id + '.infraredLamp',
            {
                "type": "state",
                "common": {
                    "name":  "infrared lamp",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "infrared lamp",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + light.id + '.multizoneLamp',
            {
                "type": "state",
                "common": {
                    "name":  "multizoneLamp",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "multizoneLamp",
                },
                "native": {

                }
            });
        adapter.setObject('Bulb_' + light.id + '.state',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Ein/Aus",
                    "type":  "boolean",
                    "role":  "light.switch",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Ein/Aus",
                },
                "native": {

                }
            });
        adapter.setObject('Bulb_' + light.id + '.hue',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Farbe",
                    "type":  "number",
                    "role":  "level.color.hue",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Farbe",
                    "min":   "0",
                    "max":   "360",
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.sat',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Sättigung",
                    "type":  "number",
                    "role":  "level.color.sat",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Sättigung",
                    "min":   "0",
                    "max":   "100",
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.bright',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Helligkeit",
                    "type":  "number",
                    "role":  "level.color.bri",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Helligkeit",
                    "min":   "0",
                    "max":   "100",
                },
                "native": {}
            });

        adapter.setObject('Bulb_' + light.id + '.temp',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Farbtemp",
                    "type":  "number",
                    "role":  "level.color.temp",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Farbtemp",
                    "min":   "2500",
                    "max":   "9000",
                    "unit":  "Kelvin"
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.online',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Erreichbar",
                    "type":  "boolean",
                    "role":  "indicator.reachable",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht erreichbar",
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.colormode',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Colormode",
                    "type":  "text",
                    "role":  "indicator.colormode",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Colormode",
                },
                "native": {}
            });
        light.getState(function(err, info) {
            if (err) {
                adapter.log.debug(err);
            }
            adapter.log.info('Label: ' + info.label);
            adapter.log.info('Power:', (info.power === 1) ? 'on' : 'off');
            adapter.log.info('Color:', info.color, '\n');
            adapter.setState('Bulb_'+ light.id +'.label', {val: info.label, ack: true});
            adapter.setState('Bulb_'+ light.id +'.state', {val: info.power, ack: true});
            adapter.setState('Bulb_'+ light.id +'.hue', {val: info.color.hue, ack: true});
            adapter.setState('Bulb_'+ light.id +'.sat', {val: info.color.saturation, ack: true});
            adapter.setState('Bulb_'+ light.id +'.bright', {val: info.color.brightness, ack: true});
            adapter.setState('Bulb_'+ light.id +'.temp', {val: info.color.kelvin, ack: true});
            adapter.setState('Bulb_'+ light.id  +'.online', {val: true, ack: true}); // because we found the lamp
            adapter.setState('Bulb_'+ light.id  +'.colormode', {val: 'white', ack: true}); // initial setting to white
        });
        light.getHardwareVersion(function(err, info) {
            if (err) {
                adapter.log.debug(err);
            }
            adapter.log.info('Vendor: ' + info.vendorName);
            adapter.log.info('Product:'+ info.productName);
            adapter.log.info('Features:' + JSON.stringify(info.productFeatures), '\n');
            adapter.setState('Bulb_'+ light.id +'.vendor', {val: info.vendorName, ack: true});
            adapter.setState('Bulb_'+ light.id +'.product', {val: info.productName, ack: true});
            adapter.setState('Bulb_'+ light.id +'.version', {val: info.version, ack: true});
            adapter.setState('Bulb_'+ light.id +'.colorLamp', {val: info.productFeatures.color, ack: true});
            adapter.setState('Bulb_'+ light.id +'.infraredLamp', {val: info.productFeatures.infrared, ack: true});
            adapter.setState('Bulb_'+ light.id +'.multizoneLamp', {val: info.productFeatures.multizone, ack: true});
            if (info.productFeatures.multizone){
                light.getColorZones(0, 255, function(err, multiz) {
                    if (err) {
                        adapter.log.debug(err);
                    }
                    adapter.log.info('Multizzone: '+JSON.stringify(multiz));
                });
            }
        });
        // if multzone the create zones and their colors, and start/end zone index
    });

    client.on('light-online', function(light) {
        adapter.log.info('Light back online. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
        adapter.setState('Bulb_'+ light.id  +'.online', {val: true, ack: true});
    });

    client.on('light-offline', function(light) {
        adapter.log.info('Light offline. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
        adapter.setState('Bulb_'+ light.id  +'.online', {val: false, ack: true});
    });

    client.on('listening', function() {
        var address = client.address();
        adapter.log.info(
            'Started LIFX listening on ' +
            address.address + ':' + address.port + '\n'
        );
    });
    client.init();
    
    /**
    cyclic update
    timout
    client.lights().forEach(function(light) {
      light.getState(function(err, info) {
        if (err) {
          adapter.log.error('Failed cyclic update for ' + light.id);
        }
            adapter.setState('Bulb_'+ light.id +'.label', {val: info.label, ack: true});
            adapter.setState('Bulb_'+ light.id +'.state', {val: info.power, ack: true});
            adapter.setState('Bulb_'+ light.id +'.hue', {val: info.color.hue, ack: true});
            adapter.setState('Bulb_'+ light.id +'.sat', {val: info.color.saturation, ack: true});
            adapter.setState('Bulb_'+ light.id +'.bright', {val: info.color.brightness, ack: true});
            adapter.setState('Bulb_'+ light.id +'.temp', {val: info.color.kelvin, ack: true});
      });
      */

}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
