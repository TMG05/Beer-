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
            node.nodeValue = textToBraille(node.nodeValue);
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                walkDOM(node.childNodes[i]);
            }
        }
    };

    walkDOM(document.body);
}

let currentUtterance = null;

function readPageAloud() {
    window.speechSynthesis.cancel(); 

    const menuText = document.getElementById('a11y-container').innerText;
    let textToRead = document.body.innerText.replace(menuText, '');
    
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.lang = 'fr-FR'; 
    currentUtterance.rate = 1.0;     
    
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
    btnBraille.addEventListener('click', () => {
        translatePageToBraille();
        btnBraille.disabled = true;
        btnBraille.innerText = "Traduit en Braille";
    });

    document.getElementById('btn-speech').addEventListener('click', readPageAloud);
    document.getElementById('btn-stop-speech').addEventListener('click', stopReading);
});
