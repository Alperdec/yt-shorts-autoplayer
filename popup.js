async function loadContentScript() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["./content.js"],
    });
}

const notify = (message) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {content: message});
    })
}

loadContentScript();

const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');

startButton.addEventListener('click', (e) => {
    notify('start');
});

stopButton.addEventListener('click', (e) => {
    notify('stop');
});