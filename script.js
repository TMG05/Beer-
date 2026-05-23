const brailleDict = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑',
    'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
    'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕',
    'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
    'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',
    ' ': ' ', '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
    '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚',
    ',': '⠂', ';': '⠆', ':': '⠒', '.': '⠲', '!': '⠖', '?': '⠦'
};

function textToBraille(text) {
    return text.toLowerCase().split('').map(char => {
        const normalizedChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return brailleDict[normalizedChar] || char; 
    }).join('');
}

function translatePageToBraille() {
    const walkDOM = (node) => {
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || (node.id && node.id === 'a11y-container')) {
            return;
        }
        if (node.nodeType === 3 && node.nodeValue.trim() !== '') {
            if (node.originalText === undefined) {
                node.originalText = node.nodeValue;
            }
            node.nodeValue = textToBraille(node.originalText);
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                walkDOM(node.childNodes[i]);
            }
        }
    };
    walkDOM(document.body);
}

function revertPageToText() {
    const walkDOM = (node) => {
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || (node.id && node.id === 'a11y-container')) {
            return;
        }
        if (node.nodeType === 3 && node.originalText !== undefined) {
            node.nodeValue = node.originalText; // On remet le texte normal
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                walkDOM(node.childNodes[i]);
            }
        }
    };
    walkDOM(document.body);
}

let currentUtterance = null;
let availableVoices = [];

function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}

loadVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getBestFrenchVoice() {
    const frenchVoices = availableVoices.filter(voice => voice.lang.startsWith('fr-'));

    if (frenchVoices.length === 0) return null;

    const premiumVoice = frenchVoices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.name.includes('Premium') ||
        voice.name.includes('Neural') ||
        voice.name.includes('Natural')
    );

    return premiumVoice || frenchVoices[0];
}

function readPageAloud() {
    window.speechSynthesis.cancel(); 
    const menuText = document.getElementById('a11y-container').innerText;
    let textToRead = document.body.innerText.replace(menuText, '').replace(/\n/g, '. ').replace(/([.!?])(?=[^\s])/g, "$1 ");
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.lang = 'fr-FR'; 
    const bestVoice = getBestFrenchVoice();
    console.log(window.speechSynthesis.getVoices().map(v => `${v.name} (${v.lang})`));
    if (bestVoice) {
        currentUtterance.voice = bestVoice;
    }
    currentUtterance.rate = 0.85; 
    currentUtterance.pitch = 0.59; 
    document.getElementById('btn-speech').style.display = 'none';
    document.getElementById('btn-stop-speech').style.display = 'block';
    currentUtterance.onend = () => {
        document.getElementById('btn-speech').style.display = 'block';
        document.getElementById('btn-stop-speech').style.display = 'none';
    };
    window.speechSynthesis.speak(currentUtterance);
}

function stopReading() {
    window.speechSynthesis.cancel();
    document.getElementById('btn-speech').style.display = 'block';
    document.getElementById('btn-stop-speech').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    
    const btnBraille = document.getElementById('btn-braille');
    const btnText = document.getElementById('btn-text'); 
    const btnSpeech = document.getElementById('btn-speech');
    const btnStopSpeech = document.getElementById('btn-stop-speech');

    btnBraille.addEventListener('click', () => {
        translatePageToBraille();
        btnBraille.style.display = 'none'; 
        btnText.style.display = 'block';   
    });

    btnText.addEventListener('click', () => {
        revertPageToText();
        btnText.style.display = 'none';    
        btnBraille.style.display = 'block';
    });

    btnSpeech.addEventListener('click', readPageAloud);
    btnStopSpeech.addEventListener('click', stopReading);

    document.addEventListener('keydown', (event) => {
        if (event.altKey && event.key.toLowerCase() === 'b') {
            event.preventDefault(); // Empêche un comportement indésirable du navigateur
            if (btnBraille.style.display !== 'none') {
                btnBraille.click();
            } else {
                btnText.click();
            }
        }
        if (event.altKey && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            if (btnSpeech.style.display !== 'none') {
                btnSpeech.click();
            } else {
                btnStopSpeech.click();
            }
        }
    });
});
