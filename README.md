# Stage Management service

This service orchestrates the application state inside the digital-stage platform and distributes it to the clients.

The stage management includes the persistent storage and distribution of all stages, their associated data and devices.
Internal we are handling the states event-driven and communicate over socket.IO.

# The Digital stage platform
## Platform overview

Digital Stage is an extended cloud infrastructure using native and web-based clients to transfer audio and video streams in wide-area networks with ultra low latency.
The platform's specialized for the usage in a creative/culture context.

In addition to the browser-based WebRTC transmission we've integrated the [ov-technologie](https://github.com/gisogrimm/ov-client) to target even lower latency, uncompressed audio quality and 3D audio features for a more musical solution.

With an IoT-approach we implemented an client management, that enables each user to use several client devices at once and remote control each other.

### Cloud infrastructure

We are proud to be featured by Digital Ocean to host our services in different datacenters around the world.
The following describes an approach to build a high scalable cloud infrastructure:

![Cloud infrastructure overview](https://github.com/digital-stage/server/blob/master/doc/overview.svg?raw=true)

#### Auth service
We handle user authentication inside our platform using the [auth services](https://github.com/digital-stage/auth-server) for user management and [JSON web token](https://jwt.io/) generation and validation.
MongoDB is used to store the user data.
Clients are communicating using HTTPS request with the auth service.

#### Stage Management Service
The stage management service stores the whole platform application state inside an MongoDB cluster.
Clients can communicate with this service using a socket.io connections.
All requests and state changes results in events, that distributed to all concerning clients.

#### Routers
A router is a service to forward and distribute video and audio streams.
This includes WebRTC using [mediasoup](https://mediasoup.org/) and ov streams using [ov udp-mirror](https://github.com/gisogrimm/ovbox/tree/master/udpmirror).

Often the connection between different datacenters is optimized, fast and reliable.
With this in mind, we are targeting to let clients always connect to the nearest and fastest router and then route the streams directly between data centers (if necessary).

#### Router distribution service
Since we are hoping for many community-driven routers around the world, we introduced the router distribution service.
Routers can register themself at the router distribution service using socket.IO connections and are then available inside the platform.
Since the socket connection is kept alive, we are also using it to obtain the availability of each single router.

Below the router and router distribution serivce is illustrated.
For better understanding the connection between to datacenters is thickened.

![Cloud infrastructure overview](https://github.com/digital-stage/server/blob/master/doc/routers-between-datacenters.svg?raw=true)
