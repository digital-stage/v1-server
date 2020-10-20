# Stage Management service

This service orchestrates the application state inside the digital-stage platform and distributes it to the clients.

The stage management includes the persistent storage and distribution of all stages, their associated data and devices.
Internal we are handling the states event-driven and communicate over socket.IO.


# docker usage for development

First run `docker-compose build` to build.

`docker-compuse up -d` starts a mongodb (ephemeral) and the server.

If the container should be run with `docker run` instead of 'docker-compose' it is import to set `--init`


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



#### Client implementation
A client initially provides the user the possibility to sign up or sign in.
When authenticated by the auth service, it fetches JSON web token and uses it to connect to the stage management service.
The stage member notifies other clients belonging to the user about a new client.
In digital stage a single device represents a single client.
The permission for the requests by the clients is proved always by the stage management service first, before the request is performed and eventually notifications are sent to other clients.


##### Web Client
The web client provides the user the handling of stages and the control of its client or other remote clients.
The handling of stages includes to create, modify or delete stages and its sub data, as well as to join and leave a stage.
We are using mediasoup to stream and receive WebRTC audio and video from routers.
For the web client frontend we are using React, next.js and are creating an own component library right now.


##### OV client
This is a headless client, written in C++.
It uses TASCAR as a 3D audio render engine and provides ultra low latency, uncompressed audio transmission.


##### Ov Box
The ov-box is a subset of configurations and software (including ov-client) to use ARM-devices (Rapsberry Pis) to send and receive ov based audio.
Since we are integrating the ov-client, we'll fully support ov-boxes inside the digital stage platform.

## Scalability
Since we want to provide the digital stage for a hugh community, we always take an eye on the scalability of the project.
Featured by Digital Ocean we are running several instances of each service.
For socket.IO we are using REDIS to synchronize the events between all instances.
This regards the stage management and auth service.
Further instead of using a single MongoDB droplet we decided to use multiple MongoDB droplets running inside a cluster.

To secure the whole platform we are using the virtual private networks to allow only private connections between services and databases, that don't need to communicate with the outer world.