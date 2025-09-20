import SpinalPressureVisualizer from './SpinalPressureVisualizer.js';

window.addEventListener('DOMContentLoaded', () => {
    new SpinalPressureVisualizer();

    const skeletonBtn = document.getElementById('skeletonViewBtn');
    if (skeletonBtn) {
        skeletonBtn.addEventListener('click', () => {
            window.location.href = 'anatomy.html';
        });
    }

    const anatomyBtn = document.getElementById('anatomyBtn');
    if (anatomyBtn) {
        anatomyBtn.addEventListener('click', () => {
            window.location.href = 'anatomy.html';
        });
    }
});
