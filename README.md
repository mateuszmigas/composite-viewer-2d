# Viewer 2D

This is experimental project for managing different kind of renderers to display 2D viewer. 
It can be used for:
- graphs
- architectual designers
- 2D games

It does not ipmlement any renderers on it's own. It's purpose is to be used in combination with existing graphic libraries like THREEJS, PixiJS and others.

What value does it bring?
- allows to use different libraries together with one manipulator
- it can synchronize rendering output, html elements will be rendered at the same time and place as WebGL for instance
- it can offload rendering to webworker
- it can offload rendering to an orchestrator that spawn and destroy webworkers as needed monitoring their performance

If you start developing software that shows some complex 2D views you will quickly realize that there is no library that is good at everything.
While WebGL is good at displaying large amount of shapes it won't do well with lots of text or some editable controls. This library allows you to use different technologies together to get best out of all worlds.

Sample renderers: 
- Html
- Canvas2D
- WebGL
- THREEJS
- PixiJS
and more.

## Creating renderer
Implement GenericRenderer interface

## Offscreen rendering


## Typescript
While it's possible to use it from Javascript it's recommended to use it with Typescript for best experience. It's obviously written in Typescript and favors compiletime checking over runtime exceptions.  
