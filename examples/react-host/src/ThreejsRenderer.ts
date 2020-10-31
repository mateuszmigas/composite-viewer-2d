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

type ThreeJsRendererPayload = {
  rectangles: RenderRectangleObject[];
};

export class ThreeJsRendererer implements Renderer<ThreeJsRendererPayload> {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(
    75, // Field of View
    window.innerWidth / window.innerHeight, // aspect ratio
    0.1, // near clipping plane
    1000 // far clipping plane
  );
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

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
    this.camera.position.z = 5; // move camera back so we can see the cube

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
    this.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };

    this.scheduleRender();
  }

  payload: any;

  render(renderPayload: ThreeJsRendererPayload) {
    this.payload = renderPayload;
    this.scheduleRender();
  }

  renderPatches(renderPayloadPatches: any) {}

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
