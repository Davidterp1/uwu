document.addEventListener('DOMContentLoaded', () => {
    const galleryCards = document.querySelectorAll('.gallery-card');
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const closeModalBtn = document.querySelector('.close-modal');

    if (!modal) return;

    galleryCards.forEach(card => {
        card.addEventListener('click', () => {
            // Extraer datos de la tarjeta clickeada
            const img = card.querySelector('img');
            const title = card.querySelector('h3');
            const description = card.querySelector('p');

            // Poblar el modal con los datos
            modalImage.src = img.src;
            modalImage.alt = img.alt;
            modalTitle.textContent = title.textContent;
            modalDescription.textContent = description.textContent;

            // Mostrar el modal
            modal.classList.add('visible');
        });
    });

    // Función para cerrar el modal
    const closeModal = () => {
        modal.classList.remove('visible');
    };

    // Event listeners para cerrar el modal
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(); // Cierra si se hace clic en el fondo
    });
});