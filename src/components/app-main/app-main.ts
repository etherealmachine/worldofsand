enum Material {
	Empty = 0,
	Stone,
	Water,
	Fire1,
	Fire2,
	Fire3,
	Fire4,
	Soot,
	Plant,
	Unknown
}

const MaterialColors : { [key:number] : [number, number, number] } = {
	0: [255, 255, 255], // Empty
	1: [150, 150, 150], // Stone
	2: [0, 50, 255],    // Water
	3: [255, 225, 5],   // Fire1
	4: [255, 132, 5],   // Fire2
	5: [255, 65, 5],    // Fire3
	6: [173, 41, 12],   // Fire4
	7: [0, 0, 0],       // Soot
	8: [0, 200, 10]     // Plant
};

enum BrushType {
	Pen = 0,
	Brush,
	SnapToGrid
}

interface StrokeEvent {
	x: number;
	y: number;
	selection: Material;
	brushSize: number;
	brushType: number;
	gridSize: number;
}

@component('app-main')
class AppMain extends polymer.Base {

	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	img: ImageData;
	frame: number;
	fpsTime: number;
	tick: number;
	tickTime: number;
	worker: Worker;
	events: Array<CustomEvent>;
	mousePosition: MouseEvent;

	@property({type: Array})
	grid: Uint8Array;

	@property({ type: Number, value: Material.Water })
	selection: Material;

	@property({ type: Number, value: 20 })
	brushSize: number;

	@property({ type: BrushType, value: BrushType.Pen })
	brushType: BrushType;

	@property({ type: Number, value: 10 })
	gridSize: number;

	@property({ type: Number, value: 0 })
	fps: number;

	@property({ type: Number, value: 0 })
	tps: number;

	initializeGrid() {
		this.grid = new Uint8Array(this.width * this.height);
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				this.grid[y * this.width + x] = Material.Empty;
			}
		}
	}

	attached() {
		window.addEventListener('beforeunload', () => {
			this.$.savedGrid.save();
		});

		const el: HTMLCanvasElement = this.$.canvas;
		this.width = el.width;
		this.height = el.height;
		this.ctx = el.getContext('2d');
		this.img = this.ctx.getImageData(0, 0, this.width, this.height);
		el.addEventListener('mousemove', this.onMouseMove.bind(this));

		this.frame = 0;
		this.fpsTime = Date.now();
		this.tick = 0;
		this.tickTime = Date.now();

		window.requestAnimationFrame(this.redraw.bind(this));

		this.events = [];
		this.worker = new Worker('/webworkers/update.js');
		this.worker.addEventListener('message', (e: MessageEvent) => {
			this.grid = e.data.grid;
			this.events.forEach(event => {
				if (event.type === 'stroke') {
					this.applyStroke(event.detail);
				} else if (event.type === 'cleargrid') {
					this.initializeGrid();
				}
			});
			this.worker.postMessage({
				'action': 'update',
				'width': this.width,
				'height': this.height,
				'grid': this.grid
			});
			this.events = [];

			this.tick++;
			const t = Date.now();
			if (t - this.tickTime >= 1000) {
				this.tps = this.tick;
				this.tick = 0;
				this.tickTime = t;
			}
		}, false);

		this.worker.postMessage({
			'action': 'update',
			'width': this.width,
			'height': this.height,
			'grid': this.grid
		});
	}

	redraw() {
		this.frame++;
		const t = Date.now();
		if (t - this.fpsTime >= 1000) {
			this.fps = this.frame;
			this.frame = 0;
			this.fpsTime = t;
		}
		for (let y = 0; y < this.img.height; y++) {
			for (let x = 0; x < this.img.width; x++) {
				const i = (y * this.width + x) * 4;
				const material = this.grid[y * this.width + x];
				const color = MaterialColors[material];
				this.img.data[i] = color[0];
				this.img.data[i + 1] = color[1];
				this.img.data[i + 2] = color[2];
				this.img.data[i + 3] = 255;
				if (this.brushType == BrushType.SnapToGrid) {
					if (x % this.gridSize === 0 || y % this.gridSize === 0) {
						this.img.data[i] = 0;
						this.img.data[i + 1] = 0;
						this.img.data[i + 2] = 0;
						this.img.data[i + 3] = 150;
					}
				}
			}
		}

		if (this.mousePosition) {
			// Preview stroke
		}

		this.ctx.clearRect(0, 0, this.img.width, this.img.height);
		this.ctx.putImageData(this.img, 0, 0);

		window.requestAnimationFrame(this.redraw.bind(this));
	}

	applyStroke(event: StrokeEvent) {
		if (event.brushType == BrushType.Pen || event.brushType == BrushType.Brush) {
			for (let xOff = -event.brushSize; xOff < event.brushSize; xOff++) {
				for (let yOff = -event.brushSize; yOff < event.brushSize; yOff++) {
					const x = event.x + xOff;
					const y = event.y + yOff;
					const dist = Math.sqrt(
						Math.pow(x - event.x, 2) +
						Math.pow(y - event.y, 2));
				  let fill = dist <= event.brushSize;
					if (event.brushType == BrushType.Brush) {
						fill = Math.random() <= 1 - (dist / event.brushSize);
					}	
					if (fill) {
						const i = y * this.width + x;
						this.grid[i] = event.selection;
					}
				}
			}
		} else if (event.brushType == BrushType.SnapToGrid) {
			const gridX = Math.floor(event.x / event.gridSize);
			const gridY = Math.floor(event.y / event.gridSize);
			for (let xOff = 0; xOff < event.gridSize; xOff++) {
				for (let yOff = 0; yOff < event.gridSize; yOff++) {
					const x = gridX * event.gridSize + xOff;
					const y = gridY * event.gridSize + yOff;
					const i = y * this.width + x;
					this.grid[i] = event.selection;
				}
			}
		}
	}

	onMouseMove(event: MouseEvent) {
		event.preventDefault();
		if (event.buttons) {
			this.events.push(new CustomEvent('stroke', { detail: <StrokeEvent>{
				x: event.layerX,
				y: event.layerY,
				selection: this.selection,
				brushSize: this.brushSize,
				brushType: this.brushType,
				gridSize: this.gridSize
			}}));
		}
		this.mousePosition = event;
	}

	onClearClicked(e: Event) {
		this.events.push(new CustomEvent('cleargrid'));
	}

}

AppMain.register();