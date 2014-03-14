simple-ui
=========

`simple-ui` is a high-productivity collection of tools and practices for rapidly writing production-ready applications.

Getting Started
---------------

```sh
$ mkdir my-new-project
$ cd my-new-project
$ npm install simple-ui
$ touch Makefile
```

The new `Makefile` should look something like this:

```make
PROJECT=my-new-project
DESCRIPTION=This is a really great app!
ORGANIZATION=my-github-org

STYLE_BUILDER=$(CURDIR)/node_modules/shoelace-stylus

include ./node_modules/simple-ui/tasks.mk
```

Once the `Makefile` is initialized, run:

```sh
$ make init
$ cp .env.example .env
$ foreman start
$ open http://localhost:5000
```

Useful Links
------------

### Libraries

* [angular.js](http://docs.angularjs.org/api)
* [ng-hyper](https://github.com/hypergroup/ng-hyper)
* [ng-hyper-translate](https://github.com/hypergroup/ng-hyper-translate)
* [ng-feature](https://github.com/camshaft/ng-feature)
* [jade](http://jade-lang.com/)
* [stylus](http://learnboost.github.io/stylus/)
* [component](https://github.com/component/component)
* [passport](http://passportjs.org/)
* [lr](https://github.com/mndvns/lr) (live-reload)

### Other

* [hyper+json](https://github.com/hypergroup/hyper-json)
