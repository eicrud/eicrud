CLI (Command line interface) package for the [Eicrud framework](https://github.com/eicrud/eicrud).

## Installation

```
npm i -g @eicrud/cli
```

## Usage

Initialise Eicrud on a Nestjs application.

```
cd project-name
eicrud setup mongo project-name
```

Generate a new service.
```
eicrud generate service myService
```

Generate a new service in a subfolder (microservice architecture).

```
eicrud generate service myService -ms myFolder
```

Generate a new command for a service.

```
eicrud generate cmd myService myCmd (-ms myFolder)
```