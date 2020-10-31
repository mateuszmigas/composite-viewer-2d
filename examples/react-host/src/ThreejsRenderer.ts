import {
  Size,
  Renderer,
  Rectangle,
  Viewport,
  RenderRectangleObject,
  RenderCircleObject,
  RenderScheduler,
  hasPropertyInChain,
  PickingOptions,
  PickingResult,
  Patch,
} from "./viewer2d";
import * as THREE from "three";
import { LogLuvEncoding } from "three";

type ThreeJsRendererPayload = {
  rectangles: RenderRectangleObject[];
};

export class ThreeJsRendererer implements Renderer<ThreeJsRendererPayload> {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
  private geometry = new THREE.BoxBufferGeometry(100, 100, 100);
  private size: Size = { width: 0, height: 0 };
  private isVisible = true;
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  scheduleRender: () => void;

  constructor(
    renderScheduler: RenderScheduler,
    private canvas: HTMLCanvasElement | OffscreenCanvas
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });

    this.scheduleRender = () => {
      if (this.payload && this.isVisible) renderScheduler(this.renderInt);
    };
  }

  setVisibility(visible: boolean) {
    this.isVisible = visible;

    if (hasPropertyInChain(this.canvas, "style"))
      this.canvas.style.visibility = visible ? "visible" : "collapse";

    this.scheduleRender();
  }

  setSize(size: Rectangle): void {
    this.size = { width: size.width, height: size.height };
    console.log("settingsize", this.size);

    this.renderer.setSize(this.size.width, this.size.height, false);
    this.updateSceneCamera();
    this.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };

    this.updateSceneCamera();
    this.scheduleRender();
  }

  payload: any;

  render(renderPayload: ThreeJsRendererPayload) {
    this.scene.clear();
    this.payload = renderPayload;

    if (renderPayload.rectangles) {
      renderPayload.rectangles.forEach(rectangle => {
        const object = new THREE.Mesh(
          this.geometry,
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(
              rectangle.color.r / 256,
              rectangle.color.g / 256,
              rectangle.color.b / 256
            ),
          })
        );

        object.position.x = 50 + rectangle.x;
        object.position.y = -rectangle.y;
        object.position.z = 1;
        object.scale.x = 1;
        object.scale.y = 1;
        object.scale.z = 0.5;
        this.scene.add(object);
      });
    }

    this.scheduleRender();
  }

  private updateSceneCamera() {
    const zoomFactor = 1 / this.viewport.zoom;
    this.camera.left = -this.viewport.position.x * zoomFactor;
    this.camera.right = this.camera.left + this.size.width * zoomFactor;
    this.camera.top = this.viewport.position.y * zoomFactor;
    this.camera.bottom = this.camera.top - this.size.height * zoomFactor;
    this.camera.updateProjectionMatrix();
  }

  renderPatches(renderPayloadPatches: any) {
    //todo
  }

  renderInt = () => {
    this.clearCanvas();

    if (!this.payload) return;

    console.log("rendering");

    this.renderer.render(this.scene, this.camera);

    // this.canvasContext.fillStyle = `rgb(
    //       ${1},
    //       ${1},
    //       ${1})`;
    // this.canvasContext.fillRect(100, 100, 200, 300);
  };

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(["c", "d"] as any);
  }

  dispose(): void {}

  private clearCanvas() {
    //this.canvasContext.clearRect(0, 0, this.size.width, this.size.height);
  }
}
