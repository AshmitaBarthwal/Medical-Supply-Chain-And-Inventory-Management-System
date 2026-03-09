const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/news/outbreaks
// @desc    Get latest disease outbreaks from WHO
// @access  Private
router.get('/outbreaks', auth, async (req, res) => {
    try {
        // Fetch from WHO API
        // We use the diseaseoutbreaknews endpoint and sort by PublicationDate descending
        const response = await fetch('https://www.who.int/api/news/diseaseoutbreaknews?$top=10&$orderby=PublicationDate desc');

        if (!response.ok) {
            throw new Error(`WHO API responded with status: ${response.status}`);
        }

        const data = await response.json();
        let outbreaks = data.value || [];

        // Medicine mapping based on common keywords
        const medicineMap = {
            'Influenza': ['Oseltamivir (Tamiflu)', 'Paracetamol', 'Vitamin C'],
            'Flu': ['Oseltamivir (Tamiflu)', 'Paracetamol'],
            'Cholera': ['ORS', 'Doxycycline', 'Azithromycin'],
            'Plague': ['Streptomycin', 'Gentamicin', 'Doxycycline'],
            'Ebola': ['Supportive Care', 'Inmazeb', 'Ebanga'],
            'MERS': ['Supportive Care', 'Antivirals'],
            'SARS': ['Supportive Care', 'Antivirals'],
            'Zika': ['Supportive Care', 'Fluids'],
            'Dengue': ['Paracetamol', 'IV Fluids'],
            'Meningitis': ['Ceftriaxone', 'Penicillin', 'Dexamethasone'],
            'Lassa': ['Ribavirin', 'Supportive Care'],
            'Yellow fever': ['Supportive Care', 'Fluids'],
            'Marburg': ['Supportive Care', 'Fluids'],
            'Polio': ['Vaccination', 'Supportive Care'],
            'Monkeypox': ['Tecovirimat', 'Vaccine'],
            'Pox': ['Antivirals'],
        };

        // Sort and enrich with suggested medicines
        outbreaks = outbreaks.sort((a, b) => {
            const dateA = new Date(a.PublicationDate);
            const dateB = new Date(b.PublicationDate);
            return dateB - dateA;
        }).map(outbreak => {
            const title = outbreak.Title || '';
            const suggested = [];

            Object.keys(medicineMap).forEach(key => {
                if (title.toLowerCase().includes(key.toLowerCase())) {
                    suggested.push(...medicineMap[key]);
                }
            });

            return {
                ...outbreak,
                suggestedMedicines: suggested.length > 0 ? [...new Set(suggested)] : ['Supportive Care']
            };
        });

        // The WHO API returns data in a 'value' array
        res.json({
            success: true,
            data: outbreaks
        });
    } catch (error) {
        console.error('Fetch outbreaks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch outbreak news',
            error: error.message
        });
    }
});

module.exports = router;
