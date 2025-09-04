class SearchSystem {
    constructor(adminSystem) {
        this.adminSystem = adminSystem;
        this.searchResults = [];
        this.setupSearchUI();
        this.bindSearchEvents();
    }

    setupSearchUI() {
        // Crear contenedor de búsqueda
        const searchContainer = document.createElement('div');
        searchContainer.id = 'searchContainer';
        searchContainer.innerHTML = `
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Buscar trabajadores...">
                <button id="searchBtn"><ion-icon name="search-sharp"></ion-icon></button>
            </div>
            <div id="searchResults" class="search-results"></div>
        `;
        
        // Insertar después de los controles para mantener el orden correcto
        const controls = document.getElementById('controls');
        if (controls) {
            controls.parentNode.insertBefore(searchContainer, controls.nextSibling);
        } else {
            // Fallback: insertar en el container si no encuentra controles
            document.getElementById('container').appendChild(searchContainer);
        }
    }

    bindSearchEvents() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchResults = document.getElementById('searchResults');
        const searchContainer = document.getElementById('searchContainer');

        if (!searchInput || !searchBtn || !searchResults || !searchContainer) {
            console.error('SearchSystem: No se pudieron encontrar todos los elementos necesarios');
            return;
        }

        // Búsqueda en tiempo real
        searchInput.addEventListener('input', (e) => {
            searchInput.classList.add('typing');
            const query = e.target.value.trim();
            
            // Verificar códigos de administrador
            if (this.adminSystem && this.adminSystem.checkAdminCode(query)) {
                searchInput.value = '';
                return;
            }
            
            if (query.length >= 2) {
                this.performSearch(query);
            } else {
                this.clearResults();
            }
            if (query.length < 2) {
                searchInput.classList.remove('typing');
            }
        });

        // Búsqueda al hacer clic
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                this.performSearch(query);
            }
        });

        // Búsqueda al presionar Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            }
        });

        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                this.clearResults();
            }
        });

        // Cerrar resultados al presionar Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearResults();
                searchInput.blur();
            }
        });

        // Mejorar accesibilidad táctil
        searchInput.addEventListener('focus', () => {
            searchContainer.classList.add('search-active');
        });

        searchInput.addEventListener('blur', () => {
            searchInput.classList.remove('typing');
            setTimeout(() => {
                searchContainer.classList.remove('search-active');
            }, 200);
        });
    }

    performSearch(query) {
        if (!this.adminSystem || typeof this.adminSystem.searchPoints !== 'function') {
            console.error('SearchSystem: adminSystem no disponible o no tiene método searchPoints');
            return;
        }

        try {
            this.searchResults = this.adminSystem.searchPoints(query);
            this.displayResults();
        } catch (error) {
            console.error('SearchSystem: Error en la búsqueda:', error);
            this.showError('Error al realizar la búsqueda');
        }
    }

    displayResults() {
        const resultsContainer = document.getElementById('searchResults');
        
        if (!resultsContainer) {
            console.error('SearchSystem: No se encontró el contenedor de resultados');
            return;
        }
        
        if (!this.searchResults || this.searchResults.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No se encontraron resultados</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        const resultsHTML = this.searchResults.map(point => `
            <div class="search-result-item" data-point-id="${point.id}">
                <div class="result-header">
                    <h4>${this.escapeHtml(point.businessName || 'Sin nombre')}</h4>
                    <span class="profession-tag">${this.escapeHtml(point.profession || 'Sin profesión')}</span>
                </div>
                <div class="result-body">
                    <p><strong>${this.escapeHtml(point.workerName || 'Sin nombre')}</strong></p>
                    <div class="rating">
                        ${'★'.repeat(Math.max(0, Math.min(5, point.rating || 0)))}${'☆'.repeat(5 - Math.max(0, Math.min(5, point.rating || 0)))} (${point.rating || 0}/5)
                    </div>
                    <p class="description">${this.escapeHtml(point.description ? (point.description.length > 100 ? point.description.substring(0, 100) + '...' : point.description) : 'Sin descripción')}</p>
                </div>
                <div class="result-actions">
                    <button onclick="searchSystem.viewPoint('${point.id}')" class="view-btn">Ver detalles</button>
                    <button onclick="searchSystem.goToPoint('${point.id}')" class="locate-btn">Ir al mapa</button>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.style.display = 'block';
    }

    clearResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        this.searchResults = [];
    }

    showError(message) {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="no-results error">${this.escapeHtml(message)}</div>`;
            resultsContainer.style.display = 'block';
        }
    }

    viewPoint(pointId) {
        const point = this.searchResults.find(p => p && p.id === pointId);
        if (point && this.adminSystem) {
            try {
                // Usar showPointPresentation en lugar de showPointDetails para consistencia
                if (typeof this.adminSystem.showPointPresentation === 'function') {
                    this.adminSystem.showPointPresentation(point);
                } else if (typeof this.adminSystem.showPointDetails === 'function') {
                    this.adminSystem.showPointDetails(point);
                } else {
                    console.error('SearchSystem: Método de presentación no disponible');
                }
                this.clearResults();
            } catch (error) {
                console.error('SearchSystem: Error al mostrar detalles del punto:', error);
            }
        }
    }

    goToPoint(pointId) {
        const point = this.searchResults.find(p => p && p.id === pointId);
        if (point && this.adminSystem && this.adminSystem.navigator) {
            try {
                // Cambiar al mapa correcto si es necesario
                if (this.adminSystem.navigator.mapSelect && this.adminSystem.navigator.mapSelect.value !== point.mapId) {
                    this.adminSystem.navigator.mapSelect.value = point.mapId;
                    if (typeof this.adminSystem.navigator.loadSVGImage === 'function') {
                        this.adminSystem.navigator.loadSVGImage();
                    }
                    
                    // Esperar a que se cargue la imagen y luego navegar
                    setTimeout(() => {
                        this.navigateToPoint(point);
                    }, 1000);
                } else {
                    this.navigateToPoint(point);
                }
                
                this.clearResults();
            } catch (error) {
                console.error('SearchSystem: Error al navegar al punto:', error);
            }
        }
    }

    navigateToPoint(point) {
        if (!point || !this.adminSystem || !this.adminSystem.navigator) {
            console.error('SearchSystem: Datos insuficientes para navegar');
            return;
        }

        const navigator = this.adminSystem.navigator;
        
        try {
            // Establecer zoom apropiado si está muy alejado
            if (navigator.scale < 1) {
                navigator.scale = Math.min(2, navigator.maxScale || 4);
            }
            
            // Centrar el punto en la pantalla
            if (navigator.canvas && navigator.canvas.width && navigator.canvas.height) {
                navigator.offsetX = navigator.canvas.width / 2 - point.x * navigator.scale;
                navigator.offsetY = navigator.canvas.height / 2 - point.y * navigator.scale;
                
                // Aplicar restricciones de navegación si el método existe
                if (typeof navigator.constrainOffset === 'function' && navigator.image) {
                    navigator.offsetX = navigator.constrainOffset(
                        navigator.offsetX, 
                        navigator.image.width * navigator.scale, 
                        navigator.canvas.width
                    );
                    navigator.offsetY = navigator.constrainOffset(
                        navigator.offsetY, 
                        navigator.image.height * navigator.scale, 
                        navigator.canvas.height
                    );
                }
                
                // Redibujar si el método existe
                if (typeof navigator.draw === 'function') {
                    navigator.draw();
                }
                
                // Actualizar info si el método existe
                if (typeof navigator.updateInfo === 'function') {
                    navigator.updateInfo();
                }

                // Actualizar posiciones de los pines después del movimiento
                setTimeout(() => {
                    if (typeof this.adminSystem.updatePinPositions === 'function') {
                        this.adminSystem.updatePinPositions();
                    }
                    this.highlightPoint(point);
                }, 100);
            }
        } catch (error) {
            console.error('SearchSystem: Error durante la navegación:', error);
        }
    }

    highlightPoint(point) {
        if (!point || !this.adminSystem || !this.adminSystem.navigator) {
            return;
        }

        try {
            const navigator = this.adminSystem.navigator;
            const screenX = point.x * navigator.scale + navigator.offsetX;
            const screenY = point.y * navigator.scale + navigator.offsetY;
            
            // Verificar que las coordenadas sean válidas
            if (isNaN(screenX) || isNaN(screenY)) {
                console.warn('SearchSystem: Coordenadas inválidas para highlight');
                return;
            }
            
            // Crear elemento de highlight para el pin
            const highlightElement = document.createElement('div');
            highlightElement.className = 'pin-highlight';
            highlightElement.style.cssText = `
                position: absolute;
                left: ${screenX - 25}px;
                top: ${screenY - 37}px;
                width: 50px;
                height: 50px;
                border: 3px solid #ffeb3b;
                border-radius: 50%;
                pointer-events: none;
                z-index: 20;
                animation: highlightPulse 2s ease-out;
            `;
            
            // Agregar estilos de animación si no existen
            this.ensureHighlightStyles();
            
            const pinContainer = document.getElementById('pinContainer');
            if (pinContainer) {
                pinContainer.appendChild(highlightElement);
                
                // Remover el highlight después de la animación
                setTimeout(() => {
                    if (highlightElement.parentNode) {
                        highlightElement.parentNode.removeChild(highlightElement);
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('SearchSystem: Error al crear highlight:', error);
        }
    }

    ensureHighlightStyles() {
        if (!document.getElementById('highlightStyles')) {
            const style = document.createElement('style');
            style.id = 'highlightStyles';
            style.textContent = `
                .search-active {
                    z-index: 150 !important;
                }
                
                @keyframes highlightPulse {
                    0% {
                        transform: scale(0.5);
                        opacity: 1;
                        border-width: 3px;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 0.7;
                        border-width: 2px;
                    }
                    100% {
                        transform: scale(1.8);
                        opacity: 0;
                        border-width: 1px;
                    }
                }
                
                @media (max-width: 768px) {
                    .pin-highlight {
                        left: ${-20}px !important;
                        top: ${-30}px !important;
                        width: 40px !important;
                        height: 40px !important;
                    }
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .pin-highlight {
                        animation: none !important;
                        opacity: 0.8;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Método utilitario para escapar HTML y prevenir XSS
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Método para obtener resultados filtrados
    getFilteredResults() {
        return this.searchResults || [];
    }

    // Método para destruir el sistema de búsqueda (cleanup)
    destroy() {
        this.clearResults();
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer && searchContainer.parentNode) {
            searchContainer.parentNode.removeChild(searchContainer);
        }
        
        const highlightStyles = document.getElementById('highlightStyles');
        if (highlightStyles && highlightStyles.parentNode) {
            highlightStyles.parentNode.removeChild(highlightStyles);
        }
        
        this.adminSystem = null;
        this.searchResults = [];
    }

    // Método para refrescar la búsqueda actual
    refresh() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim().length >= 2) {
            this.performSearch(searchInput.value.trim());
        }
    }
}