var Material;
(function (Material) {
    Material[Material["Empty"] = 0] = "Empty";
    Material[Material["Stone"] = 1] = "Stone";
    Material[Material["Water"] = 2] = "Water";
    Material[Material["Fire1"] = 3] = "Fire1";
    Material[Material["Fire2"] = 4] = "Fire2";
    Material[Material["Fire3"] = 5] = "Fire3";
    Material[Material["Fire4"] = 6] = "Fire4";
    Material[Material["Soot"] = 7] = "Soot";
    Material[Material["Plant"] = 8] = "Plant";
    Material[Material["Unknown"] = 9] = "Unknown";
})(Material || (Material = {}));
var Simulation = (function () {
    function Simulation(grid, width, height) {
        this.grid = grid;
        this.width = width;
        this.height = height;
        this.newGrid = new Uint8Array(this.width * this.height);
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var i = y * this.width + x;
                this.newGrid[i] = this.grid[i];
            }
        }
    }
    Simulation.prototype.calculatePressure = function () {
        this.pressure = new Uint8Array(this.width * this.height);
        for (var x = 0; x < this.width; x++) {
            var pressure = 1;
            for (var y = 0; y < this.height; y++) {
                var i = y * this.width + x;
                if (this.grid[i] === Material.Water) {
                    pressure++;
                }
                else {
                    pressure = 1;
                }
                this.pressure[i] = pressure;
            }
        }
    };
    Simulation.prototype.update = function () {
        for (var y = this.height; y >= 0; y--) {
            if (Math.random() < 0.5) {
                for (var x = 0; x < this.width; x++) {
                    this.updateCell(x, y);
                }
            }
            else {
                for (var x = this.width - 1; x >= 0; x--) {
                    this.updateCell(x, y);
                }
            }
        }
    };
    Simulation.prototype.updateCell = function (x, y) {
        var i = y * this.width + x;
        var material = this.grid[i];
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
    };
    Simulation.prototype.updateWater = function (i, x, y) {
        var down = this.gridAt(x, y + 1, Material.Empty);
        if (down) {
            this.move(i, down);
            return;
        }
        if (y >= this.height - 1) {
            this.newGrid[y * this.width + x] = Material.Empty;
            return;
        }
        var downLeft = this.gridAt(x - 1, y + 1, Material.Empty);
        var downRight = this.gridAt(x + 1, y + 1, Material.Empty);
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
        var left = this.gridAt(x - 1, y, Material.Empty);
        var right = this.gridAt(x + 1, y, Material.Empty);
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
    };
    Simulation.prototype.updateFire = function (i, x, y) {
        var up = (y - 1) * this.width + x;
        if (this.grid[i] === Material.Soot) {
            this.newGrid[i] = Material.Empty;
            return;
        }
        if (Math.random() < 0.1) {
            this.newGrid[i] = Material.Empty;
            this.newGrid[up] = this.grid[i] + 1;
            return;
        }
        var left = y * this.width + (x - 1);
        if (Math.random() < 0.4) {
            this.move(i, left);
            return;
        }
        var right = y * this.width + (x + 1);
        if (Math.random() < 0.4) {
            this.move(i, right);
            return;
        }
        if (this.gridAt(x, y - 1, Material.Plant)) {
            this.newGrid[up] = Material.Fire1;
            return;
        }
        else {
            this.move(i, up);
        }
    };
    Simulation.prototype.updatePlant = function (i, x, y) {
        var up = (y - 1) * this.width + x;
        if (up >= 0 && this.newGrid[up] === Material.Water) {
            this.newGrid[up] = Material.Plant;
            return;
        }
    };
    Simulation.prototype.move = function (from, to) {
        if (to >= 0) {
            this.newGrid[from] = Material.Empty;
            this.newGrid[to] = this.grid[from];
        }
    };
    Simulation.prototype.gridAt = function (x, y, mat) {
        var i = y * this.width + x;
        if (i < 0 || i >= this.grid.length) {
            return 0;
        }
        return this.newGrid[i] === mat ? i : 0;
    };
    return Simulation;
}());
this.addEventListener('message', function (e) {
    var sim = new Simulation(e.data.grid, e.data.width, e.data.height);
    if (e.data.action === 'update') {
        sim.update();
        this.postMessage({
            'action': 'newGrid',
            'grid': sim.newGrid
        });
    }
}, false);
