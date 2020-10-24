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

## How it works
graph here

## Creating renderer
Implement GenericRenderer interface

## RenderScheduler
When rendering with multiple renderers in main thread and webworkers you may or may not want to synchronize output. Library comes with multiple types of schedulers:
- instantRenderer
- rafScheduler
- ...

## Offscreen rendering requirements
This library can move the renderer to the web worker assuming the browser supports it. If it's not supported it will fallback to main thread rendering.

There are some requirements:
1. type must be as follows:
```js
constructor(renderScheduler: RenderScheduler, canvas: HTMLCanvasElement | OffscreenCanvas, ...otherParams: any)

render(payload: Serializable<T>)
}
```
otherParams must be serializable
1. Your renderer needs to have contructor of type (renderScheduler: RenderScheduler, canvas: HtmlCanvasElement, ...otherParams: Serializable<T>)
- renderScheduler will be used to synchronize rendering with main thread. You don't have to use it but it's better to do so
- canvas - this is the element it will draw on, control will be transfered to offscreen
- otherParams - any params that can be serialized. This renderer will be created in web worker so this data has to be passed through postMessage
2. RenderPayload passed to render function needs to be serializable for same reason as above
3. You need to create web worker file template and expose it to rendering proxy with renderer contructor types:

```js
//renderWorker.template.ts
import { MyCustomRenderer } from "./MyCustomRenderer";
import { exposeToProxy } from "./viewer2d";
const renderWorker: Worker = self as any;
exposeToProxy(renderWorker, [MyCustomRenderer]); 
```

4. You need to pass function that creates web workers to renderer factory. Library has no way of knowing how your boundling system works so you need to tell it how to create web workers
```js
const createRenderWorker = (name: string) =>
  new Worker("./renderWorker.template.ts", {
    type: "module",
    name: `${name}.Renderer`,
  });
```

and that's it. Now your renderer can be used either on main thread or in webworker(s). This also ensures it can be orchestrated (spread into multiple workers)

## Offcreen rendering orchestration
It's possible to spawn multiple web workers for your renderer. 
Create your renderer with ....

Initially it will spawn one web worker and monitor it's performance. If it's less than {16ms} it will spawn another worker and split rendering.
There are two ways:
- ....
- ....

## Typescript
While it's possible to use it from Javascript it's recommended to use it with Typescript for best experience. It's obviously written in Typescript and favors compiletime checking over runtime exceptions.  
