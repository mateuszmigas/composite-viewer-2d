# Viewer 2D

This is an experimental project for bringing together different kinds of renderers and using them as one with offscreen rendering capabilities.

Just a robot right? But it's rendered by 4 different renderers

![](https://github.com/mateuszmigas/viewer-2d/blob/master/docs/images/sync.gif)

| Renderer         | Part     | Executor |
| ----------------- | --------------------- |----------------|
| PixiJS | eyes/mouth | Main thread |
| HtmlDivElement | text | Main thread |
| Canvas2D | borders | Web worker |
| ThreeJS | rectangles | Spread accross 1-4 web workers |

It can be used for:
- graphs
- architectual designers
- 2D games

If you start developing software that shows some complex 2D views you will quickly realize that there is no library that is good at everything.
While WebGL is good at displaying large amount of shapes it won't do well with lots of text or some editable controls. This library allows you to use different technologies together to get best out of all worlds. It does not impmlement any renderers on it's own altho it comes with some examples how to integrate with pupular ones. It's purpose is to be used in combination with existing graphic libraries like ThreeJS, PixiJS and others. 

# What can it do?
- manipulatting different renderers with one manipulator
- synchronizing rendering output [section here]
- offscreen web worker rendering with same API as main thread
- orchestrated offscreen web worker rendering with same API as main thread. It monitors web workers performance and spawns and destroys them as needed 

# How it works?

![](https://github.com/mateuszmigas/viewer-2d/blob/master/docs/diagrams/howitworks.svg)



## Browser support

| Browser         | Is supported     |
| ----------------- | --------------------- |
| Chrome | yes |
| rest :) | not tested |


## Creating renderer

Implement GenericRenderer interface

## render vs renderPatch

For your data to be delivered to webworker it first needs to be "serialized" so it can go through "postMessage". Passing entire render object every time something small changed is obviously an overkill and will not scale well. To address that there is a companion method "renderPatch" which contains only "changes"

The idea is as follows:
First render - render
Everything/almost everything changed - render
Small changes, like moving few objects - patchRender

"renderPatch" also allows you to implement some more cleaver optimizations much easier. You know exacly which part of your render data changed so you can rerender
only portion of the screen
(example here)

## RenderScheduler

When rendering with multiple renderers in main thread and webworkers you may or may not want to synchronize stuff:

| Scheduler         | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `instantRenderer` | Initial values for part of the state that will be controlled by the hook     |
| `rafScheduler`    | Current values of part of the state that will be controlled by the Component |

Keep in mind this is optimistic synchronization, it will work for workers and main thread that meet the budget and they will not wait for others that are not.

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

todo docs:


## Developing

Terminal 1 (main directory):
`yarn`
`yarn run watch`

Terminal 2 (examples\react-host directory):
`yarn`
`yarn start`
