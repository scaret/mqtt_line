var mows     = require("mows");
var mqtt     = require("mqtt");
var fs       = require("fs");
var clients = {}; // from all the servers

// callback for all the servers. They should work exactly the same
var callback_createServer = function (client)
{
    //.........................................................
    var callback_connect = function (packet)
    {
        console.log("  connected:",packet.clientId);
        client.connack({returnCode: 0});
        //trust the client and accept the clientId
        client.id = packet.clientId;
        clients[client.id] = client;
        client.subscriptions = {};
    };
    //.........................................................
    var callback_subscribe = function (packet)
    {
        console.log("  subscribe:", client.id, "=>", packet.subscriptions);
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
            var qos   = packet.subscriptions[i].qos;
            var topic = packet.subscriptions[i].topic;
            //from MQTT rule to JavaScript regexp
            // needs further config later.
            var reg   = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+').replace("*","\S*") + '$');
            granted.push(packet.subscriptions[i].qos);
            client.subscriptions[topic] = reg;
        }
        client.suback({granted: granted, messageId: packet.messageId});
    };
    //.........................................................
    var callback_publish = function (packet)
    {
        console.log("  publish:", client.id, "=>", packet.topic);
        var validation = function(client, topic)
        {
            for(var key in client.subscriptions)
            {
                if (client.subscriptions[key].test(topic))
                {
                    return true;
                }
            }
        }
        ///////////////////////////////////////////////////////
          for (var k in clients)
          {
              var the_client = clients[k];
              if (the_client && validation(the_client, packet.topic))
              {
                  the_client.publish({topic: packet.topic, payload: packet.payload});
                  console.log("  distribute:%s => ( [%s], %s )", the_client.id, packet.topic, packet.payload);
              }
          }

    };
    //.........................................................
    var callback_unsubscribe = function (packet)
    {
        console.log("  unsubscribe:", client.id, "=>", packet.unsubscriptions);
        for(var topicIndex in packet.unsubscriptions)
        {
            var the_topic = packet.unsubscriptions[topicIndex];
            delete client.subscriptions[the_topic];
        }
    }
    ///////////////////////////////////////////////////////////
    client.on('connect', callback_connect);
    client.on('subscribe', callback_subscribe);
    client.on('publish', callback_publish);
    client.on('unsubscribe', callback_unsubscribe);

    client.on('pingreq', function(packet) {
        client.pingresp();
    });

    client.on('disconnect', function(packet) {
        console.log("  disconnect:",client.id);
        delete clients[client.id];
        client.stream.end();
    });

    client.on('close', function(err) {
        console.log("  close:",client.id);
        delete clients[client.id];
    });

    client.on('error', function(err) {
        console.log("  error:",client.id);
        delete clients[client.id];
        client.stream.end();
        console.log('error!');
    });
}

///////////////////////////////////////////////////////////////////////////////////////
// creates the mqtt websocket server
var server = mows.createServer(callback_createServer);
server.listen(8080);

// creates the secure websocket server
var secureOpts = {
    key : fs.readFileSync("tls-key.pem"  ),
    cert: fs.readFileSync("tls-cert.pem" )
};
var secureServer = mows.createSecureServer(secureOpts, callback_createServer);
secureServer.listen(4443);

// create the mqtt server
var mqttServer = mqtt.createServer(callback_createServer);
mqttServer.listen(1883);
