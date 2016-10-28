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
	events: Array<Event>;
	mousePosition: MouseEvent;

	@property({type: Array})
	grid: Uint8Array;

	@property({ type: Number, value: Material.Water })
	selection: Material;

	@property({ type: Number })
	brushSize: number;

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
				if (event.type === 'mousemove') {
					for (let yOff = -this.brushSize; yOff < this.brushSize; yOff++) {
						for (let xOff = -this.brushSize; xOff < this.brushSize; xOff++) {
							const x = this.mousePosition.layerX + xOff;
							const y = this.mousePosition.layerY + yOff;
							const dist = Math.sqrt(
								Math.pow(x - this.mousePosition.layerX, 2) +
								Math.pow(y - this.mousePosition.layerY, 2));
						  const r = dist / this.brushSize;
							if (Math.random() > 0.5 && Math.random() >= r) {
								const i = y * this.width + x;
								this.grid[i] = this.selection;
							}
						}
					}
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
			}
		}

		if (this.mousePosition) {
			for (let yOff = -this.brushSize; yOff < this.brushSize; yOff++) {
				for (let xOff = -this.brushSize; xOff < this.brushSize; xOff++) {
					const x = this.mousePosition.layerX + xOff;
					const y = this.mousePosition.layerY + yOff;
					const dist = Math.sqrt(
						Math.pow(x - this.mousePosition.layerX, 2) +
						Math.pow(y - this.mousePosition.layerY, 2));
					if (dist < this.brushSize) {
						const i = (y * this.width + x) * 4;
						const color = MaterialColors[this.selection];
						this.img.data[i] = color[0];
						this.img.data[i + 1] = color[1];
						this.img.data[i + 2] = color[2];
						this.img.data[i + 3] = 50;
					}
				}
			}
		}

		this.ctx.clearRect(0, 0, this.img.width, this.img.height);
		this.ctx.putImageData(this.img, 0, 0);

		window.requestAnimationFrame(this.redraw.bind(this));
	}

	onMouseMove(event: MouseEvent) {
		event.preventDefault();
		if (event.buttons) {
			this.events.push(event);
		}
		this.mousePosition = event;
	}

	onClearClicked(e: Event) {
		this.events.push(new Event('cleargrid'));
	}

}

AppMain.register();