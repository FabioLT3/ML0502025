class AdminSystem {
    constructor(navigator) {
        this.navigator = navigator;
        this.isAdminMode = false;
        this.points = this.loadPoints();
        this.selectedPoint = null;
        this.pinElements = new Map(); // Para trackear los elementos de pin
        this.setupAdminUI();
        this.bindAdminEvents();
        this.createPinContainer();
    }

    createPinContainer() {
        // Crear contenedor para los pines
        if (!document.getElementById('pinContainer')) {
            const pinContainer = document.createElement('div');
            pinContainer.id = 'pinContainer';
            pinContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 10;
                width: 100%;
                height: 100%;
            `;
            
            // Insertar después del canvas
            this.navigator.canvas.parentNode.insertBefore(pinContainer, this.navigator.canvas.nextSibling);
        }
    }

    setupAdminUI() {
        // Crear modal para agregar/editar puntos
        const adminModal = document.createElement('div');
        adminModal.id = 'adminModal';
        adminModal.className = 'admin-modal';
        adminModal.innerHTML = `
            <div class="admin-modal-content">
                <span class="admin-close">&times;</span>
                <h2 id="modalTitle">whatsappo</h2>
                <form id="pointForm">
                    <div class="form-group">
                        <label for="profileImage">Foto de Perfil:</label>
                        <input type="file" id="profileImage" accept="image/*">
                        <div id="profilePreview" class="profile-preview"></div>
                    </div>
                    <div class="form-group">
                        <label>ID:</label>
                        <input type="text" id="pointId" required>
                    </div>
                    <div class="form-group">
                        <label for="businessName">Nombre del Trabajador:</label>
                        <input type="text" id="businessName" required>
                    </div>
                    <div class="form-group">
                        <label for="workerName">Nombre del Negocio:</label>
                        <input type="text" id="workerName" required>
                    </div>
                    <div class="form-group">
                        <label for="whatsapp">WhatsApp:</label>
                        <input type="tel" id="whatsapp" pattern="[0-9]+" placeholder="Ejemplo: 5512345678">
                    </div>
                    <div class="form-group">
                        <label>Trabajo/Profesión:</label>
                        <input type="text" id="profession" required placeholder="Ej: Plomero, Electricista, Carpintero...">
                        <div id="professionTags" class="profession-tags"></div>
                    </div>
                    <div class="form-group">
                        <label>Calificación (1-5 estrellas):</label>
                        <div class="star-rating">
                            <span class="star" data-rating="1">★</span>
                            <span class="star" data-rating="2">★</span>
                            <span class="star" data-rating="3">★</span>
                            <span class="star" data-rating="4">★</span>
                            <span class="star" data-rating="5">★</span>
                        </div>
                        <input type="hidden" id="rating" value="0">
                    </div>
                    <div class="form-group">
                        <label>Descripción:</label>
                        <textarea id="description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Imágenes:</label>
                        <input type="file" id="images" multiple accept="image/*" class="file-input">
                        <div id="imagePreview" class="image-preview"></div>
                    </div>
                    <div class="form-actions">
                        <button type="submit">Guardar</button>
                        <button type="button" id="cancelBtn">Cancelar</button>
                        <button type="button" id="deleteBtn" style="background: #dc3545;">Eliminar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(adminModal);

        // Crear botones de admin
        const adminButton = document.createElement('button');
        adminButton.id = 'adminToggle';
        adminButton.textContent = 'Modo Admin';
        adminButton.style.display = 'none';
        
        const exportButton = document.createElement('button');
        exportButton.id = 'exportBtn';
        exportButton.textContent = 'Exportar Datos';
        exportButton.style.display = 'none';
        
        const importButton = document.createElement('button');
        importButton.id = 'importBtn';
        importButton.textContent = 'Importar Datos';
        importButton.style.display = 'none';
        
        // Input oculto para importar
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.id = 'importInput';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        
        const controls = document.getElementById('controls');
        controls.appendChild(adminButton);
        controls.appendChild(exportButton);
        controls.appendChild(importButton);
        controls.appendChild(importInput);
    }

    bindAdminEvents() {
        // Evento para abrir modal al hacer clic en el canvas
        this.navigator.canvas.addEventListener('click', (e) => {
            this.handleInteraction(e);
        });
        
        this.navigator.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.handleInteraction(touch);
        });
    }

    handleInteraction(event) {
        const rect = this.navigator.canvas.getBoundingClientRect();
        const x = Math.round((event.clientX - rect.left - this.navigator.offsetX) / this.navigator.scale);
        const y = Math.round((event.clientY - rect.top - this.navigator.offsetY) / this.navigator.scale);
        
        const clickedPoint = this.findPointAtCoordinates(event.clientX - rect.left, event.clientY - rect.top);
        
        if (clickedPoint) {
            if (this.isAdminMode) {
                this.editPoint(clickedPoint);
            } else {
                this.showPointPresentation(clickedPoint);
            }
        } else if (this.isAdminMode) {
            this.showAddPointModal(x, y);
        }
    }

    checkAdminCode(code) {
        if (code === 'prueba') {
            this.enableAdminMode();
            return true;
        } else if (code === '3245677') {
            this.disableAdminMode();
            return true;
        }
        return false;
    }

    enableAdminMode() {
        this.isAdminMode = true;
        document.getElementById('adminToggle').style.display = 'block';
        document.getElementById('exportBtn').style.display = 'block';
        document.getElementById('importBtn').style.display = 'block';
        document.body.classList.add('admin-mode');
        this.showNotification('Modo Administrador Activado', 'success');
        this.updatePinColors(); // Actualizar colores de los pines
    }

    disableAdminMode() {
        this.isAdminMode = false;
        document.getElementById('adminToggle').style.display = 'none';
        document.getElementById('exportBtn').style.display = 'none';
        document.getElementById('importBtn').style.display = 'none';
        document.body.classList.remove('admin-mode');
        this.hideModal();
        this.savePoints(); // Guardar cambios permanentemente
        this.showNotification('Cambios guardados. Modo Visitante activado', 'success');
        this.updatePinColors(); // Actualizar colores de los pines
    }

    toggleAdminMode() {
        if (this.isAdminMode) {
            this.disableAdminMode();
        }
    }

    showAddPointModal(x, y) {
        // Guardar las coordenadas para usarlas en savePoint
        this.currentX = x;
        this.currentY = y;

        // Actualizar título y mostrar modal
        document.getElementById('modalTitle').textContent = 'Agregar Punto';
        
        // Ocultar botón de eliminar para nuevos puntos
        document.getElementById('deleteBtn').style.display = 'none';
        
        // Resetear el formulario
        this.resetForm();
        
        // Limpiar punto seleccionado
        this.selectedPoint = null;
        
        // Mostrar el modal
        const adminModal = document.getElementById('adminModal');
        adminModal.classList.add('show');
        adminModal.style.display = 'flex';
    }

    editPoint(point) {
        this.selectedPoint = point;
        const adminModal = document.getElementById('adminModal');
    
        if (!adminModal) {
            console.error('Modal no encontrado');
            return;
        }

        // Mostrar el modal primero
        adminModal.classList.add('show');
        adminModal.style.display = 'flex';

        // Mostrar el botón de eliminar en modo edición
    document.getElementById('deleteBtn').style.display = 'block';

        // Actualizar título y campos
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Editar Punto';
        }

        // Rellenar campos con los datos existentes
        const fields = {
            'businessName': point.businessName || '',
            'workerName': point.workerName || '',
            'profession': point.profession || '',
            'description': point.description || '',
            'whatsapp': point.whatsapp || ''
        };

        // Actualizar cada campo si existe
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        // Mostrar imagen de perfil si existe
        const profilePreview = document.getElementById('profilePreview');
        if (profilePreview && point.profileImage) {
            profilePreview.innerHTML = `<img src="${point.profileImage}" alt="Foto de perfil actual">`;
            profilePreview.style.display = 'block';
        }

        // Actualizar calificación
        this.currentRating = point.rating || 0;
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < this.currentRating);
        });

        // Guardar coordenadas
        this.currentX = point.x;
        this.currentY = point.y;
    }

    hideModal() {
        const adminModal = document.getElementById('adminModal');
        if (adminModal) {
            adminModal.classList.remove('show');
            adminModal.style.display = 'none';
            this.selectedPoint = null;
            this.resetForm();
        }
    }

    resetForm() {
        const form = document.getElementById('pointForm');
        if (form) {
            form.reset();
            const profilePreview = document.getElementById('profilePreview');
            if (profilePreview) {
                profilePreview.style.display = 'none';
                profilePreview.innerHTML = '';
            }
        }
    }

    setRating(rating) {
        document.getElementById('rating').value = rating;
        document.querySelectorAll('.star').forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    async savePoint() {
        const form = document.getElementById('pointForm');
        
        if (form.checkValidity()) {
            const pointData = {
                id: this.selectedPoint ? this.selectedPoint.id : Date.now().toString(),
                mapId: this.navigator.mapSelect.value,
                businessName: document.getElementById('businessName').value.trim(),
                workerName: document.getElementById('workerName').value.trim(),
                profession: document.getElementById('profession').value.trim(),
                description: document.getElementById('description').value.trim(),
                whatsapp: document.getElementById('whatsapp').value.trim(),
                rating: parseFloat(document.getElementById('rating').value) || 0,
                x: this.currentX,
                y: this.currentY
            };

            // Manejar imagen de perfil
            const profileImageInput = document.getElementById('profileImage');
            if (profileImageInput.files[0]) {
                pointData.profileImage = await this.convertImageToBase64(profileImageInput.files[0]);
            } else if (this.selectedPoint && this.selectedPoint.profileImage) {
                pointData.profileImage = this.selectedPoint.profileImage;
            }

            // Manejar imágenes adicionales
            const currentImages = this.getCurrentImages();
            if (currentImages && currentImages.length > 0) {
                pointData.images = currentImages;
            }

            if (this.selectedPoint) {
                // Actualizar punto existente
                const index = this.points.findIndex(p => p.id === this.selectedPoint.id);
                if (index !== -1) {
                    this.points[index] = pointData;
                }
            } else {
                // Agregar nuevo punto
                this.points.push(pointData);
            }

            // Guardar y actualizar vista
            this.savePoints();
            this.clearAllPins();
            this.drawPoints();
            this.hideModal();
            
            this.showNotification(
                this.selectedPoint ? 'Punto actualizado correctamente' : 'Nuevo punto agregado', 
                'success'
            );
        }
    }

    // Asegúrate de que el método savePoints() esté implementado correctamente
    savePoints() {
        try {
            localStorage.setItem('mapPoints', JSON.stringify(this.points));
            console.log('Puntos guardados:', this.points);
        } catch (error) {
            console.error('Error al guardar puntos:', error);
            this.showNotification('Error al guardar los cambios', 'error');
        }
    }

    deleteCurrentPoint() {
        if (this.selectedPoint && confirm('¿Estás seguro de que quieres eliminar este punto?')) {
            const index = this.points.findIndex(p => p.id === this.selectedPoint.id && p.mapId === this.selectedPoint.mapId);
            if (index !== -1) {
                this.points.splice(index, 1);
                this.hideModal();
                this.drawPoints();
                this.showNotification('Punto eliminado correctamente', 'success');
            }
        }
    }

    findPointAtCoordinates(canvasX, canvasY) {
        const currentMapPoints = this.points.filter(p => p.mapId === this.navigator.mapSelect.value);
        
        for (let point of currentMapPoints) {
            const screenX = point.x * this.navigator.scale + this.navigator.offsetX;
            const screenY = point.y * this.navigator.scale + this.navigator.offsetY;
            
            // Área de detección para el icono
            const detectionRadius = 20;
            
            const distance = Math.sqrt(Math.pow(canvasX - screenX, 2) + Math.pow(canvasY - screenY, 2));
            if (distance <= detectionRadius) {
                return point;
            }
        }
        return null;
    }

    drawPoints() {
        // Limpiar pines existentes
        this.clearAllPins();
        
        const currentMapPoints = this.points.filter(p => p.mapId === this.navigator.mapSelect.value);
        
        currentMapPoints.forEach(point => {
            this.createPinElement(point);
        });
    }

    createPinElement(point) {
        const screenX = point.x * this.navigator.scale + this.navigator.offsetX;
        const screenY = point.y * this.navigator.scale + this.navigator.offsetY;
        
        // Crear elemento del pin
        const pinElement = document.createElement('div');
        const pinId = `pin-${point.id}-${point.mapId}`;
        pinElement.id = pinId;
        pinElement.className = 'map-pin';
        
        // Color según el modo
        const pinColor = this.isAdminMode ? '#ff6b6b' : '#4CAF50';
        
        pinElement.innerHTML = `<ion-icon name="location-sharp"></ion-icon>`;
        pinElement.style.cssText = `
            position: absolute;
            left: ${screenX - 12}px;
            top: ${screenY - 24}px;
            color: ${pinColor};
            font-size: 30px;
            pointer-events: auto;
            cursor: pointer;
            transition: all 0.2s ease;
            z-index: 15;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        `;
        
        // Evento click para el pin
        pinElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isAdminMode) {
                this.editPoint(point);
            } else {
                this.showPointPresentation(point);
            }
        });
        
        // Hover effect
        pinElement.addEventListener('mouseenter', () => {
            pinElement.style.transform = 'scale(1.2)';
            pinElement.style.filter = 'drop-shadow(3px 3px 6px rgba(0,0,0,0.4))';
        });
        
        pinElement.addEventListener('mouseleave', () => {
            pinElement.style.transform = 'scale(1)';
            pinElement.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';
        });
        
        // Agregar tooltip con información básica
        pinElement.title = `${point.businessName} - ${point.profession}`;
        
        document.getElementById('pinContainer').appendChild(pinElement);
        this.pinElements.set(pinId, pinElement);
    }

    clearAllPins() {
        const pinContainer = document.getElementById('pinContainer');
        if (pinContainer) {
            pinContainer.innerHTML = '';
        }
        this.pinElements.clear();
    }

    updatePinColors() {
        // Actualizar colores de todos los pines existentes
        const pinColor = this.isAdminMode ? '#ff6b6b' : '#4CAF50';
        
        this.pinElements.forEach((pinElement) => {
            pinElement.style.color = pinColor;
        });
    }

    updatePinPositions() {
        // Actualizar posiciones de los pines cuando se mueve/escala el mapa
        const currentMapPoints = this.points.filter(p => p.mapId === this.navigator.mapSelect.value);
        
        currentMapPoints.forEach(point => {
            const pinId = `pin-${point.id}-${point.mapId}`;
            const pinElement = this.pinElements.get(pinId);
            
            if (pinElement) {
                const screenX = point.x * this.navigator.scale + this.navigator.offsetX;
                const screenY = point.y * this.navigator.scale + this.navigator.offsetY;
                
                pinElement.style.left = `${screenX - 12}px`;
                pinElement.style.top = `${screenY - 24}px`;
                
                // Ocultar pines fuera de vista
                const isVisible = screenX >= -30 && screenX <= this.navigator.canvas.width + 30 && 
                                screenY >= -40 && screenY <= this.navigator.canvas.height + 30;
                
                pinElement.style.display = isVisible ? 'block' : 'none';
            }
        });
    }

    searchPoints(query) {
        if (!query) return [];
        
        const currentMapPoints = this.points.filter(p => p.mapId === this.navigator.mapSelect.value);
        query = query.toLowerCase();
        
        return currentMapPoints.filter(point => 
            point.workerName.toLowerCase().includes(query) ||
            point.businessName.toLowerCase().includes(query) ||
            point.profession.toLowerCase().includes(query) ||
            point.description.toLowerCase().includes(query)
        );
    }

    showPointPresentation(point) {
        const presentationModal = document.createElement('div');
        presentationModal.className = 'presentation-modal';
        presentationModal.innerHTML = `
            <div class="presentation-modal-content">
                <span class="presentation-close">&times;</span>
                
                <div class="presentation-header" style="background: #4CAF50;">
                    ${point.profileImage ? `
                        <div class="profile-image">
                            <img src="${point.profileImage}" alt="Foto de perfil">
                        </div>
                    ` : `
                        <div class="profile-image">
                            <ion-icon name="person"></ion-icon>
                        </div>
                    `}
                    <h2>${point.businessName}</h2>
                    <div class="rating-display">
                        ${'★'.repeat(Math.floor(point.rating))}${'☆'.repeat(5 - Math.floor(point.rating))}
                        <span class="rating-number">(${point.rating}/5)</span>
                    </div>
                </div>
                
                <div class="presentation-body">
                    <div class="info-section">
                        <div class="info-item">
                            <span class="info-label">
                                <ion-icon name="person"></ion-icon> Negocio:
                            </span>
                            <span class="info-value">${point.workerName}</span>
                        </div>
                        
                        <div class="info-item">
                            <span class="info-label">
                                <ion-icon name="briefcase"></ion-icon> Oficio:
                            </span>
                            <span class="info-value profession-highlight">${point.profession}</span>
                        </div>

                        ${point.whatsapp ? `
                            <div class="info-item">
                                <span class="info-label">
                                    <ion-icon name="logo-whatsapp"></ion-icon> WhatsApp:
                                </span>
                                <a href="https://wa.me/52${point.whatsapp}" class="whatsapp-link" target="_blank">
                                    ${point.whatsapp}
                                </a>
                            </div>
                        ` : ''}
                    </div>

                    ${point.description ? `
                        <div class="description-section">
                            <h4><ion-icon name="document-text"></ion-icon> Descripción</h4>
                            <p>${point.description}</p>
                        </div>
                    ` : ''}

                    ${point.images && point.images.length > 0 ? `
                        <div class="images-section">
                            <h4><ion-icon name="images"></ion-icon> Galería</h4>
                            <div class="presentation-images">
                                ${point.images.map(img => `
                                    <img src="${img}" alt="Imagen del trabajo" class="presentation-image">
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(presentationModal);
        
        // Agregar event listeners para las imágenes
        const images = presentationModal.querySelectorAll('.presentation-image');
        images.forEach(img => {
            img.addEventListener('click', () => {
                img.classList.toggle('fullscreen');
            });
        });

        // Cerrar modal
        const closeBtn = presentationModal.querySelector('.presentation-close');
        closeBtn.onclick = () => presentationModal.remove();
        
        presentationModal.onclick = (e) => {
            if (e.target === presentationModal) {
                presentationModal.remove();
            }
        };
    }

    showPointDetails(point) {
        // Crear modal de detalles
        const detailModal = document.createElement('div');
        detailModal.className = 'detail-modal';
        detailModal.innerHTML = `
            <div class="detail-modal-content">
                <span class="detail-close">&times;</span>
                <h2>${point.businessName}</h2>
                <div class="point-info">
                    <p><strong>Trabajador:</strong> ${point.workerName}</p>
                    <p><strong>Profesión:</strong> ${point.profession}</p>
                    <div class="rating-display">
                        <strong>Calificación:</strong> 
                        ${'★'.repeat(point.rating)}${'☆'.repeat(5 - point.rating)}
                    </div>
                    <p><strong>Descripción:</strong> ${point.description || 'Sin descripción'}</p>
                    ${point.images && point.images.length > 0 ? `
                        <div class="point-images">
                            ${point.images.map(img => `<img src="${img}" alt="Imagen" class="point-image">`).join('')}
                        </div>
                    ` : ''}
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
            </div>
        `;
        
        document.body.appendChild(detailModal);
        
        // Enfocar el punto en el mapa
        this.navigator.offsetX = this.navigator.canvas.width / 2 - point.x * this.navigator.scale;
        this.navigator.offsetY = this.navigator.canvas.height / 2 - point.y * this.navigator.scale;
        this.navigator.draw();
    }

    loadPoints() {
        const saved = localStorage.getItem('mapPoints');
        return saved ? JSON.parse(saved) : [];
    }

    savePoints() {
        localStorage.setItem('mapPoints', JSON.stringify(this.points));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Nuevas funciones para manejo de imágenes
    handleImageUpload(event) {
        const files = event.target.files;
        const preview = document.getElementById('imagePreview');
        
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'image-preview-item';
                    imageDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" class="preview-image">
                        <button type="button" class="remove-image" onclick="this.parentElement.remove()">×</button>
                    `;
                    preview.appendChild(imageDiv);
                };
                reader.readAsDataURL(file);
            }
        }
        
        // Limpiar el input para permitir seleccionar las mismas imágenes de nuevo
        event.target.value = '';
    }

    getCurrentImages() {
        const previewImages = document.querySelectorAll('#imagePreview .preview-image');
        return Array.from(previewImages).map(img => img.src);
    }

    displayExistingImages(images) {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        
        images.forEach(imageSrc => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'image-preview-item';
            imageDiv.innerHTML = `
                <img src="${imageSrc}" alt="Existing image" class="preview-image">
                <button type="button" class="remove-image" onclick="this.parentElement.remove()">×</button>
            `;
            preview.appendChild(imageDiv);
        });
    }

    // Funciones para exportar/importar datos
    exportData() {
        const data = {
            points: this.points,
            exportDate: new Date().toISOString(),
            version: "1.0"
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `puntos_mapa_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        this.showNotification('Datos exportados correctamente', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validar estructura del archivo
                if (!data.points || !Array.isArray(data.points)) {
                    throw new Error('Archivo inválido: no contiene puntos válidos');
                }

                // Confirmar importación
                if (confirm(`¿Importar ${data.points.length} puntos? Esto reemplazará todos los datos actuales.`)) {
                    this.points = data.points;
                    this.savePoints();
                    this.drawPoints();
                    this.showNotification(`${data.points.length} puntos importados correctamente`, 'success');
                }
            } catch (error) {
                this.showNotification('Error al importar: archivo inválido', 'error');
                console.error('Error de importación:', error);
            }
        };
        
        reader.readAsText(file);
        
        // Limpiar input
        event.target.value = '';
    }

    // Función para respaldar automáticamente en la nube (requiere configuración adicional)
    async backupToCloud() {
        // Esta función requeriría configurar un servicio como Firebase, Supabase, etc.
        // Por ahora, solo guarda localmente
        this.savePoints();
        
        // Ejemplo de cómo se vería con Firebase:
        /*
        try {
            const response = await fetch('https://tu-proyecto.firebaseio.com/points.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.points)
            });
            
            if (response.ok) {
                this.showNotification('Respaldo en la nube exitoso', 'success');
            }
        } catch (error) {
            this.showNotification('Error en respaldo: ' + error.message, 'error');
        }
        */
    }

    // Función para restaurar desde la nube
    async restoreFromCloud() {
        // Esta función también requeriría configuración de servicios en la nube
        /*
        try {
            const response = await fetch('https://tu-proyecto.firebaseio.com/points.json');
            if (response.ok) {
                const cloudPoints = await response.json();
                if (cloudPoints && Array.isArray(cloudPoints)) {
                    this.points = cloudPoints;
                    this.savePoints();
                    this.drawPoints();
                    this.showNotification('Datos restaurados desde la nube', 'success');
                }
            }
        } catch (error) {
            this.showNotification('Error al restaurar: ' + error.message, 'error');
        }
        */
    }
}