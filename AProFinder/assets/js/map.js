class ImageMapNavigator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.mapSelect = document.getElementById('mapSelect');
        this.loadingMessage = document.getElementById('loadingMessage');
        
        this.image = null;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastOffset = { x: 0, y: 0 };
        
        // Variables para pinch-to-zoom en móviles
        this.isPinching = false;
        this.initialPinchDistance = 0;
        this.initialScale = 1;
        this.pinchCenter = { x: 0, y: 0 };
        
        this.minScale = 0.1;
        this.maxScale = 50;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.loadSVGImage();
        this.updateInfo();
        
        // Inicializar sistemas adicionales
        this.adminSystem = new AdminSystem(this);
        this.searchSystem = new SearchSystem(this.adminSystem);
        
        // Hacer disponible globalmente para los botones
        window.searchSystem = this.searchSystem;
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Configurar canvas para alta calidad y mejor rendimiento en móviles
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Configurar pixel ratio para pantallas de alta densidad
        const pixelRatio = window.devicePixelRatio || 1;
        if (pixelRatio > 1) {
            this.canvas.width *= pixelRatio;
            this.canvas.height *= pixelRatio;
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.height = window.innerHeight + 'px';
            this.ctx.scale(pixelRatio, pixelRatio);
        }
    }
    
    setupEventListeners() {
        const container = document.getElementById('container');
        
        // Event listener para el selector de mapas
        this.mapSelect.addEventListener('change', () => {
            this.loadSVGImage();
        });
        
        // Mouse events
        container.addEventListener('mousedown', (e) => this.startDrag(e));
        container.addEventListener('mousemove', (e) => this.drag(e));
        container.addEventListener('mouseup', () => this.endDrag());
        container.addEventListener('mouseleave', () => this.endDrag());
        container.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Touch events mejorados para dispositivos móviles
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.startDrag(e.touches[0]);
            } else if (e.touches.length === 2) {
                this.startPinch(e.touches);
            }
        });
        
        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                this.drag(e.touches[0]);
            } else if (e.touches.length === 2 && this.isPinching) {
                this.handlePinch(e.touches);
            }
        });
        
        container.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                this.endDrag();
                this.endPinch();
            } else if (e.touches.length === 1 && this.isPinching) {
                this.endPinch();
                this.startDrag(e.touches[0]);
            }
        });
        
        // Resize con debounce para mejor rendimiento
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        });
        
        // Prevenir zoom del navegador en dispositivos móviles
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
        
        // Prevenir scroll en dispositivos móviles
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }
    
    loadSVGImage() {
        const selectedMapPath = this.mapSelect.value;
        this.loadingMessage.style.display = 'block';
        this.loadingMessage.textContent = 'Cargando mapa...';
        this.loadingMessage.style.color = 'white';
        
        const img = new Image();
        img.onload = () => {
            this.image = img;
            this.loadingMessage.style.display = 'none';
            this.resetView();
            
            // Cargar puntos del nuevo mapa después de que se cargue la imagen
            if (this.adminSystem) {
                this.adminSystem.drawPoints();
            }
        };
        
        img.onerror = () => {
            this.loadingMessage.textContent = `Error: No se pudo cargar ${selectedMapPath}`;
            this.loadingMessage.style.color = '#ff6b6b';
            console.error(`Error al cargar el archivo SVG: ${selectedMapPath}`);
        };
        
        img.src = selectedMapPath;
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.lastOffset = { x: this.offsetX, y: this.offsetY };
    }
    
    drag(e) {
        if (!this.isDragging || !this.image) return;
        
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        
        const newOffsetX = this.lastOffset.x + dx;
        const newOffsetY = this.lastOffset.y + dy;
        
        // Limitar navegación dentro de la imagen
        this.offsetX = this.constrainOffset(newOffsetX, this.image.width * this.scale, this.canvas.width);
        this.offsetY = this.constrainOffset(newOffsetY, this.image.height * this.scale, this.canvas.height);
        
        this.draw();
        this.updateInfo();
        
        // Actualizar posiciones de los pines DOM
        if (this.adminSystem) {
            this.adminSystem.updatePinPositions();
        }
    }
    
    constrainOffset(offset, imageSize, canvasSize) {
        const maxOffset = 0;
        const minOffset = canvasSize - imageSize;
        
        if (imageSize <= canvasSize) {
            // Si la imagen es más pequeña que el canvas, centrarla
            return (canvasSize - imageSize) / 2;
        }
        
        return Math.max(minOffset, Math.min(maxOffset, offset));
    }
    
    endDrag() {
        this.isDragging = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        if (!this.image) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * 0.1);
        
        const newScale = this.scale * zoom;
        if (newScale < this.minScale || newScale > this.maxScale) return;
        
        // Zoom hacia el punto del mouse
        let newOffsetX = this.offsetX - mouseX / this.scale + mouseX / newScale;
        let newOffsetY = this.offsetY - mouseY / this.scale + mouseY / newScale;
        
        this.scale = newScale;
        
        // Limitar navegación dentro de la imagen después del zoom
        this.offsetX = this.constrainOffset(newOffsetX, this.image.width * this.scale, this.canvas.width);
        this.offsetY = this.constrainOffset(newOffsetY, this.image.height * this.scale, this.canvas.height);
        
        this.draw();
        this.updateInfo();
        
        // Actualizar posiciones de los pines DOM después del zoom
        if (this.adminSystem) {
            this.adminSystem.updatePinPositions();
        }
    }
    
    handleResize() {
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        
        this.setupCanvas();
        
        // Ajustar offset para mantener la posición relativa
        if (oldWidth > 0 && oldHeight > 0) {
            const scaleX = this.canvas.width / oldWidth;
            const scaleY = this.canvas.height / oldHeight;
            this.offsetX *= scaleX;
            this.offsetY *= scaleY;
        }
        
        this.draw();
        
        // Actualizar posiciones de los pines DOM después del resize
        if (this.adminSystem) {
            this.adminSystem.updatePinPositions();
        }
    }
    
    // Funciones para pinch-to-zoom en móviles
    startPinch(touches) {
        this.isPinching = true;
        this.isDragging = false;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        this.initialPinchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        this.initialScale = this.scale;
        
        this.pinchCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    handlePinch(touches) {
        if (!this.isPinching || !this.image) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        const scaleChange = currentDistance / this.initialPinchDistance;
        const newScale = this.initialScale * scaleChange;
        
        if (newScale < this.minScale || newScale > this.maxScale) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const centerX = this.pinchCenter.x - rect.left;
        const centerY = this.pinchCenter.y - rect.top;
        
        // Zoom hacia el punto central del pinch
        let newOffsetX = this.offsetX - centerX / this.scale + centerX / newScale;
        let newOffsetY = this.offsetY - centerY / this.scale + centerY / newScale;
        
        this.scale = newScale;
        this.offsetX = this.constrainOffset(newOffsetX, this.image.width * this.scale, this.canvas.width);
        this.offsetY = this.constrainOffset(newOffsetY, this.image.height * this.scale, this.canvas.height);
        
        this.draw();
        this.updateInfo();
        
        // Actualizar posiciones de los pines DOM durante el pinch
        if (this.adminSystem) {
            this.adminSystem.updatePinPositions();
        }
    }
    
    endPinch() {
        this.isPinching = false;
    }
    
    draw() {
        if (!this.image) return;
        
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar imagen con optimización para móviles
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        
        // Usar filtrado más eficiente en dispositivos móviles
        if (window.innerWidth <= 768) {
            this.ctx.imageSmoothingEnabled = this.scale > 1;
        }
        
        this.ctx.drawImage(this.image, this.offsetX / this.scale, this.offsetY / this.scale);
        this.ctx.restore();
        
        // Ya no dibujamos puntos aquí porque ahora son elementos DOM
        // Los pines se manejan automáticamente como elementos HTML
    }
    
    zoomIn() {
        if (!this.image || this.scale >= this.maxScale) return;
        
        const zoomFactor = window.innerWidth <= 768 ? 1.3 : 1.5;
        const newScale = this.scale * zoomFactor;
        
        // Zoom hacia el centro de la pantalla
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Calcular nueva posición para mantener el centro
        const newOffsetX = this.offsetX - centerX / this.scale + centerX / newScale;
        const newOffsetY = this.offsetY - centerY / this.scale + centerY / newScale;
        
        this.scale = newScale;
        this.offsetX = this.constrainOffset(newOffsetX, this.image.width * this.scale, this.canvas.width);
        this.offsetY = this.constrainOffset(newOffsetY, this.image.height * this.scale, this.canvas.height);
        
        this.draw();
        this.updateInfo();
        
        // Actualizar posiciones de los pines DOM
        if (this.adminSystem) {
            this.adminSystem.updatePinPositions();
        }
    }
    
    zoomOut() {
        if (!this.image || this.scale <= this.minScale) return;
        
        const zoomFactor = window.innerWidth <= 768 ? 1.3 : 1.5;
        const newScale = this.scale / zoomFactor;
        
        // Zoom hacia el centro de la pantalla
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Calcular nueva posición para mantener el centro
        const newOffsetX = this.offsetX - centerX / this.scale + centerX / newScale;
        const newOffsetY = this.offsetY - centerY / this.scale + centerY / newScale;
        
        this.scale = newScale;
        this.offsetX = this.constrainOffset(newOffsetX, this.image.width * this.scale, this.canvas.width);
        this.offsetY = this.constrainOffset(newOffsetY, this.image.height * this.scale, this.canvas.height);
        
        this.draw();
        this.updateInfo();
        
        // Actualizar posiciones de los pines DOM
        if (this.adminSystem) {
            this.adminSystem.updatePinPositions();
        }
    }
    
    resetView() {
        if (!this.image) return;
        
        this.scale = 0.1; // Zoom inicial del 10%
        this.offsetX = (this.canvas.width - this.image.width * this.scale) / 2;
        this.offsetY = (this.canvas.height - this.image.height * this.scale) / 2;
        this.draw();
        this.updateInfo();
        
        // Actualizar posiciones de los pines DOM
        if (this.adminSystem) {
            this.adminSystem.drawPoints();
        }
    }
    
    fitToScreen() {
        if (!this.image) return;
        
        const scaleX = this.canvas.width / this.image.width;
        const scaleY = this.canvas.height / this.image.height;
        this.scale = Math.min(scaleX, scaleY);
        
        // Aplicar las restricciones de navegación
        this.offsetX = this.constrainOffset((this.canvas.width - this.image.width * this.scale) / 2, this.image.width * this.scale, this.canvas.width);
        this.offsetY = this.constrainOffset((this.canvas.height - this.image.height * this.scale) / 2, this.image.height * this.scale, this.canvas.height);
        
        this.draw();
        this.updateInfo();
        
        // Actualizar posiciones de los pines DOM
        if (this.adminSystem) {
            this.adminSystem.updatePinPositions();
        }
    }
    
    updateInfo() {
        document.getElementById('zoomLevel').textContent = Math.round(this.scale * 100) + '%';
        document.getElementById('position').textContent = `${Math.round(-this.offsetX)}, ${Math.round(-this.offsetY)}`;
        if (this.image) {
            document.getElementById('imageSize').textContent = `${this.image.width} x ${this.image.height}`;
        }
    }
}

// Inicializar
let navigator;

window.addEventListener('load', () => {
    navigator = new ImageMapNavigator();
});

// Funciones para botones
function zoomIn() {
    if (navigator) {
        navigator.zoomIn();
    }
}

function zoomOut() {
    if (navigator) {
        navigator.zoomOut();
    }
}

function fitToScreen() {
    if (navigator) {
        navigator.fitToScreen();
    }
}

