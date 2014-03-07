var mows     = require("mows");
var mqtt     = require("mqtt");

var servers = [];

// callback for all the servers. They should work exactly the same
var callback_createServer = function (client)
{
    var self = this;
    servers.push(this);
    if (!self.clients) self.clients = {};

    //.........................................................
    var callback_connect = function (packet)
    {
        console.log("  connected:",packet.clientId);
        var client = this;
        client.connack({returnCode: 0});
        //trust the client and accept the clientId
        client.id = packet.clientId;
        self.clients[client.id] = client;
        client.subscriptions = [];
    };
    //.........................................................
    var callback_subscribe = function (packet)
    {
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
            var qos   = packet.subscriptions[i].qos;
            var topic = packet.subscriptions[i].topic;
            //from MQTT rule to JavaScript regexp
            // needs further config later.
            var reg   = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+').replace("*","\S*") + '$');
            granted.push(packet.subscriptions[i].qos);
            client.subscriptions.push(reg);
            console.log("  subscribe:", client.id, "=>", topic);
        }
        client.suback({granted: granted, messageId: packet.messageId});
    };
    //.........................................................
    var callback_publish = function (packet)
    {
        var validation = function(client, topic)
        {
            return client.subscriptions.some(function(reg){
                return reg.test(topic);
            });
        }
        ///////////////////////////////////////////////////////
        for(var s in servers){
          for (var k in servers[s].clients)
          {
              var the_client = servers[s].clients[k];
              if (the_client && validation(the_client, packet.topic))
              {
                  the_client.publish({topic: packet.topic, payload: packet.payload});
                  console.log("  distribute:%s => ( [%s], %s )", the_client.id, packet.topic, packet.payload);
              }
          }
        }

    };

    ///////////////////////////////////////////////////////////
    client.on('connect', callback_connect);
    client.on('subscribe', callback_subscribe);
    client.on('publish', callback_publish);


    client.on('pingreq', function(packet) {
        client.pingresp();
    });

    client.on('disconnect', function(packet) {
        client.stream.end();
    });

    client.on('close', function(err) {
        delete self.clients[client.id];
    });

    client.on('error', function(err) {
        client.stream.end();
        console.log('error!');
    });
}

///////////////////////////////////////////////////////////////////////////////////////
// creates the mqtt websocket server
var server = mows.createServer(callback_createServer);
server.listen(8080);

// create the mqtt server
var mqttServer = mqtt.createServer(callback_createServer);
mqttServer.listen(1883);