import {
  Size,
  Renderer,
  Rectangle,
  Viewport,
  RenderRectangleObject,
  RenderScheduler,
  hasPropertyInChain,
  PickingOptions,
  PickingResult,
  Patch,
  isArrayPatch,
  applyPatches,
} from "../viewer2d";
import * as THREE from "three";

type ThreeJsRendererPayload = {
  rectangles: RenderRectangleObject[];
};

export class ThreeJsRendererer implements Renderer<ThreeJsRendererPayload> {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 0, 0, 0, -2, 2);
  private geometry = new THREE.BoxBufferGeometry(1, 1, 1);

  private size: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  private isVisible = true;
  private payload: ThreeJsRendererPayload | null = null;
  private scheduleRender: () => void;

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
      if (this.payload && this.isVisible) renderScheduler(this.renderInternal);
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
    this.renderer.setSize(this.size.width, this.size.height, false);
    this.updateSceneCamera();
    this.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };

    this.updateSceneCamera();
    this.scheduleRender();
  }

  render(payload: ThreeJsRendererPayload) {
    this.scene.clear();
    this.payload = payload;

    if (payload.rectangles) {
      payload.rectangles.forEach(rectangle => {
        this.scene.add(this.createCubeFromRectangle(rectangle));
      });
    }

    this.scheduleRender();
  }

  renderPatches(payloadPatches: Patch<ThreeJsRendererPayload>[]) {
    if (this.payload) {
      applyPatches(this.payload, payloadPatches);

      payloadPatches.forEach(patch => {
        if (
          patch.path === "rectangles" &&
          isArrayPatch(patch) &&
          patch.op === "add"
        ) {
          //only add elements
          this.scene.add(...patch.values.map(this.createCubeFromRectangle));
        } else {
          //just rebuild all, can be optimized here
          this.scene.clear();
          this.payload?.rectangles.forEach(rectangle => {
            this.scene.add(this.createCubeFromRectangle(rectangle));
          });
        }
      });

      this.scheduleRender();
    }
  }

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    //todo hit testing here
    return Promise.resolve(["c", "d"] as any);
  }

  dispose() {
    this.scene.clear();
    this.geometry.dispose();
    //todo check materials dispose
  }

  private renderInternal = () => {
    if (!this.payload) return;

    this.renderer.render(this.scene, this.camera);
  };

  private updateSceneCamera() {
    const zoomFactor = 1 / this.viewport.zoom;
    this.camera.left = -this.viewport.position.x * zoomFactor;
    this.camera.right = this.camera.left + this.size.width * zoomFactor;
    this.camera.top = this.viewport.position.y * zoomFactor;
    this.camera.bottom = this.camera.top - this.size.height * zoomFactor;
    this.camera.updateProjectionMatrix();
  }

  private createCubeFromRectangle = (rectangle: RenderRectangleObject) => {
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

    object.position.x = rectangle.x + rectangle.width / 2;
    object.position.y = 100 - rectangle.y - rectangle.height / 2;
    object.position.z = 1;
    object.scale.x = rectangle.width;
    object.scale.y = rectangle.height;
    object.scale.z = 1;
    return object;
  };
}
