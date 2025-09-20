import SpinalPressureVisualizer from './SpinalPressureVisualizer.js';

window.addEventListener('DOMContentLoaded', () => {
    new SpinalPressureVisualizer();

    // Skeleton View button redirect
    const skeletonBtn = document.getElementById('skeletonViewBtn');
    if (skeletonBtn) {
        skeletonBtn.addEventListener('click', () => {
            window.location.href = 'anatomy.html'; // redirect to Anatomy Viewer
        });
    }

    // Anatomy button redirect
    const anatomyBtn = document.getElementById('anatomyBtn');
    if (anatomyBtn) {
        anatomyBtn.addEventListener('click', () => {
            window.location.href = 'anatomy.html';
        });
    }
});
