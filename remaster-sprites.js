"use strict";

class RemasterSprites {
  constructor(url, columns = 5, rows = 4) {
    this.ready = false;
    this.tiles = [];
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth / columns;
      const height = image.naturalHeight / rows;
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const tile = document.createElement("canvas");
        tile.width = tile.height = 32;
        const context = tile.getContext("2d");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, col * width, row * height, width, height, 0, 0, 32, 32);
        this.tiles.push(tile);
      }
      this.ready = true;
    };
    image.src = url;
  }

  draw(context, index, x, y, width, height) {
    if (!this.ready || !this.tiles[index]) return false;
    context.drawImage(this.tiles[index], Math.round(x), Math.round(y), width, height);
    return true;
  }
}

class RemasterBackgrounds {
  constructor(url) {
    this.ready = false;
    this.tiles = [];
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth / 2;
      const height = image.naturalHeight / 2;
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
        const tile = document.createElement("canvas");
        tile.width = 320;
        tile.height = 200;
        const context = tile.getContext("2d");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, col * width, row * height, width, height, 0, 0, 320, 200);
        this.tiles.push(tile);
      }
      this.ready = true;
    };
    image.src = url;
  }

  draw(context, index, x, y, width, height) {
    if (!this.ready) return false;
    context.drawImage(this.tiles[index % 4], Math.round(x), Math.round(y), width, height);
    return true;
  }
}
