# mqtt_line

This repo aims to provide an example to connect mqtt and websocket-mqtt together.

这个repo尝试提供一个既基于网络层的mqtt，又基于websocket的例子。一个mqtt消息，不管从哪里发出，都应该
被不同渠道的订阅者顺利获得。

通过应用mqtt.js与mows，达成了这个目的。由于后者调用的方法与前者完全相同，我们甚至使用了相同的回调函数，
并且把来自不同渠道的client放入了同一个字典。

启动broker.js后，会启动基于mqtt/ws/wss的三个服务器，使用各自的协议侦听三个端口，并且任何一种客户端的
消息都会被发送到其他两种上。

请注意，这个例子并不是mqtt服务器的桥接。