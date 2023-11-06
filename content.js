let autoplay = false;
let timeoutId = undefined;
let scrollLock = false;
const failMessage = 'Error: AutoPlayer: ';
const container = document.getElementById('shorts-container');

async function retry(fn, maxAttempts = 5, baseDelayMs = 100) {
    let attempt = 1;

    const exec = async () => {
        try {
            return await fn();
        } catch (e) {
            if (attempt >= maxAttempts) {
                throw e;
            }
        }

        const delayMs = baseDelayMs * 2 ** attempt;
        console.log(`Retry attempt ${attempt} after ${delayMs}ms`);

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        attempt++;
        return exec();
    }

    return exec();
}

function waitFor(fn, callback, opts) {
    let { onFail, failureCallback, ...rest } = opts;

    onFail = onFail ? onFail : "";
    failureCallback = failureCallback ? failureCallback : ()  => {};

    const shim = () => new Promise((resolve, reject) => {
        res = fn();
        res ? resolve(res) : reject(onFail);
    });

    return retry(shim)
        .then((res) => {
            callback(res);
        })
        .catch(err => {
            console.log(err);
            failureCallback();
        });
}

function getId(src) {
    if (!src) return '';
    const arr = src.split('/');
    return arr[arr.length-1];
}

function getVideo() {
    const elems = document.getElementsByTagName('video');
    // return first video with a defined duration
    if (elems && elems.length) {
        for (const e of elems) {
            if (!isNaN(e.duration)) {
                return e;
            }
        }
    }
}

function next() {
    container.scrollBy(0, 1);
}

function autoPlayLoop()  {
    const options = {
        onFail: "Unable to find a playable video",
        failureCallback: () => {
            alert(failMessage + " shutting down");
            return stop();
        },
    };
    waitFor(getVideo, (short) => {
        if (short.paused) {
            short.play();
        }
        const timeLeft = short.duration - short.currentTime;
    
        timeoutId = setTimeout(() => {
            // get current video id
            const id = getId(short.src);
            // scroll to next video
            scrollLock = true;
            next();
            const options = {
                onFail: "Unable to find DOM update",
                failureCallback: () => {
                    alert(failMessage + " shutting down");
                    scrollLock = false;
                    return stop();
                },
            };
            const checkIdMatch = () => {
                return id !== getId(getVideo()?.src);
            }
            // wait for new video to be loaded before we continue
            waitFor(checkIdMatch, () => { scrollLock = false; autoPlayLoop(); }, options);
        }, timeLeft*1000);
    }, options);
}

function start() {
    if (!autoplay) {
        console.log('Running');
        if ( window.location.toString().startsWith('https://www.youtube.com/shorts') ) {
            autoplay = true;
            autoPlayLoop();
        } else {
            console.log('stopping');
            alert('Please navigate to https://www.youtube.com/shorts');
        }
    } else {
        console.log('Already running')
    }
}

function stop() {
    if (autoplay) {
        console.log('Stopping');
        autoplay = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

function pause() {
    if (autoplay) {
        console.log('Pausing');
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

function resume() {
    if (autoplay) {
        autoPlayLoop();
    }
}

console.log("Content Script Injected");

chrome.runtime.onMessage.addListener((message) => {
    if (message.content === 'start') {
        start();
    } else if (message.content === 'stop') {
        stop();
    } else {
        console.log('Unable to process message request: ', message.content);
    }
});

container.addEventListener('scroll', () => {
    if (!scrollLock) {
        console.log('scroll')
        pause();
    }
});

container.addEventListener('scrollend', () => {
    if(!scrollLock) {
        console.log('scrollend')
        resume();
    }
});

container.addEventListener('click', () => {
    stop();
});
