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

class Simulation {

	public newGrid: Uint8Array;
	private pressure: Uint8Array;

	constructor(
		public grid: Uint8Array,
		public width: number,
		public height: number
	) {
		this.newGrid = new Uint8Array(this.width * this.height);
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const i = y * this.width + x;
				this.newGrid[i] = this.grid[i];
			}
		}
	}

	calculatePressure() {
		this.pressure = new Uint8Array(this.width * this.height);
		for (let x = 0; x < this.width; x++) {
			let pressure = 1;
			for (let y = 0; y < this.height; y++) {
				const i = y * this.width + x;
				if (this.grid[i] === Material.Water) {
					pressure++;
				} else {
					pressure = 1;
				}
				this.pressure[i] = pressure;
			}
		}
	}

	update() {
		for (let y = this.height; y >= 0; y--) {
			if (Math.random() < 0.5) {
				for (let x = 0; x < this.width; x++) {
					this.updateCell(x, y);
				}
			} else {
				for (let x = this.width - 1; x >= 0; x--) {
					this.updateCell(x, y);
				}
			}
		}
	}

	updateCell(x: number, y: number) {
		const i = y * this.width + x;
		const material = this.grid[i];
		switch (material) {
			case Material.Water:
				this.updateWater(i, x, y);
				break;
			case Material.Fire1:
			case Material.Fire2:
			case Material.Fire3:
			case Material.Fire4:
			case Material.Soot:
				this.updateFire(i, x, y);
				break;
			case Material.Plant:
				this.updatePlant(i, x, y);
				break;
		}
	}

	updateWater(i: number, x: number, y: number) {
		const down = this.gridAt(x, y + 1, Material.Empty);
		if (down) {
			this.move(i, down);
			return;
		}
		if (y >= this.height - 1) {
			this.newGrid[y * this.width + x] = Material.Empty;
			return;
		}
		let downLeft = this.gridAt(x - 1, y + 1, Material.Empty);
		const downRight = this.gridAt(x + 1, y + 1, Material.Empty);
		if (downLeft && downRight) {
			downLeft = Math.random() < 0.5 ? downLeft : 0;
		}
		if (downLeft) {
			this.move(i, downLeft);
			return;
		}
		if (downRight) {
			this.move(i, downRight);
			return;
		}
		let left = this.gridAt(x - 1, y, Material.Empty);
		const right = this.gridAt(x + 1, y, Material.Empty);
		if (left && right) {
			left = Math.random() < 0.5 ? left : 0;
		}
		if (left) {
			this.move(i, left);
			return;
		}
		if (right) {
			this.move(i, right);
			return;
		}
	}

	updateFire(i: number, x: number, y: number) {
		const up = (y - 1) * this.width + x;
		if (this.grid[i] === Material.Soot) {
			this.newGrid[i] = Material.Empty;
			return;
		}
		if (Math.random() < 0.1) {
			this.newGrid[i] = Material.Empty;
			this.newGrid[up] = this.grid[i] + 1;
			return;
		}
		const left = y * this.width + (x - 1);
		if (Math.random() < 0.4) {
			this.move(i, left);
			return;
		}
		const right = y * this.width + (x + 1);
		if (Math.random() < 0.4) {
			this.move(i, right);
			return;
		}
		if (this.gridAt(x, y - 1, Material.Plant)) {
			this.newGrid[up] = Material.Fire1;
			return;
		} else {
			this.move(i, up);
		}
	}

	updatePlant(i: number, x: number, y: number) {
		const up = (y - 1) * this.width + x;
		if (up >= 0 && this.newGrid[up] === Material.Water) {
			this.newGrid[up] = Material.Plant;
			return;
		}
	}

	move(from: number, to: number) {
		if (to >= 0) {
			this.newGrid[from] = Material.Empty;
			this.newGrid[to] = this.grid[from];
		}
	}

	gridAt(x: number, y: number, mat: Material): number {
		const i = y * this.width + x;
		if (i < 0 || i >= this.grid.length) {
			return 0;
		}
		return this.newGrid[i] === mat ? i : 0;
	}

}

this.addEventListener('message', function(e: any) {
	const sim = new Simulation(e.data.grid, e.data.width, e.data.height);
	if (e.data.action === 'update') {
		sim.update();
		this.postMessage({
			'action': 'newGrid',
			'grid': sim.newGrid
		});
	}
}, false);