Locker - the "me" platform
======================

This is an open source project that helps me collect all of my social data from wherever it is online into one place, and then lets me do really awesome stuff with it.

STATUS: eager-developer-friendly only at this point, we're working hard to make it usable for early adopters very soon, keep an eye on [@lockerproject](http://twitter.com/lockerproject) and [@jeremie](http://twitter.com/jeremie) for progress! 

To get started I'll need node and npm installed, then to install dependencies (from the Locker directory, and this may take a while to run):

    npm install

To turn on my locker run:

	node locker.js
	
Then go to to the dashboard (and be amazed by the design!):

	http://localhost:8042/

What are these things?

* Connectors - A service that knows how to connect to and sync data with a place where I have data about myself, such as an account on a site or service, or in some desktop app, on my phone, or even from a device.
* Collections - My data from the many different sources gets organized into common collections, such as places, contacts, messages, statuses, pages, etc.
* Apps - Once my data is in my locker, I can then run apps locally within that locker that do useful or fun things for me without having to give my data up to any web site or give anyone access to my online accounts.

Once I "install" them in my locker (give them some working space, a local port, and some config), I can then browse to them where they have their own instructions/steps (for now, it's early yet and pretty manual).  To learn more about the innards, install/try the Dev Docs app :)

We need *TONS* of help and it's welcomed across the board, particularly in adding and advancing more of the connectors, just don a hard-hat and dig in, all patches welcomed, personal data FTW!

I am the platform.
