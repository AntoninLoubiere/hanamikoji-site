const timer = document.getElementById('timer');
const targetTime = new Date(timer.getAttribute('data-time'));
const elsFrom = [
    document.querySelector('#timer-seconds-1 .from'),
    document.querySelector('#timer-seconds-2 .from'),
    document.querySelector('#timer-minutes-1 .from'),
    document.querySelector('#timer-minutes-2 .from'),
    document.querySelector('#timer-hours-1 .from'),
    document.querySelector('#timer-hours-2 .from'),
    document.querySelector('#timer-days-1 .from'),
    document.querySelector('#timer-days-2 .from'),
]

const elsTo = [
    document.querySelector('#timer-seconds-1 .to'),
    document.querySelector('#timer-seconds-2 .to'),
    document.querySelector('#timer-minutes-1 .to'),
    document.querySelector('#timer-minutes-2 .to'),
    document.querySelector('#timer-hours-1 .to'),
    document.querySelector('#timer-hours-2 .to'),
    document.querySelector('#timer-days-1 .to'),
    document.querySelector('#timer-days-2 .to'),
]

let lastVals = [0, 0, 0, 0, 0, 0, 0, 0];

function init(id, val, is_42) {
    elsFrom[id].innerText = val;
    lastVals[id] = val;
    elsTo[id].innerText = lastVals[id];

    if (is_42) {
        elsFrom[id].classList.add('t42');
    }
}

function update(id, val, is_42) {
    if (lastVals[id] != val) {
         const baseId = id - id % 2;
        if (is_42) {
            elsFrom[baseId].classList.add('t42');
            elsFrom[baseId + 1].classList.add('t42');
        } else if (lastVals[baseId] == 2 && lastVals[baseId + 1] == 4) {
            elsFrom[baseId].classList.remove('t42');
            elsFrom[baseId + 1].classList.remove('t42');
            elsTo[baseId].classList.add('t42');
        } else if (baseId == id) {
            elsTo[baseId].classList.remove('t42');
        }
        elsFrom[id].innerText = val;
        elsTo[id].innerText = lastVals[id];
        lastVals[id] = val;
        elsTo[id].animate([{
            opacity: 1,
            transform: "translateY(0%)"
        },
        {
            opacity: 0,
            transform: "translateY(50%)"
        }],
        {
            duration: 200,
            easing: "ease-out"
        })
        elsFrom[id].animate([{
            opacity: 0,
            transform: "translateY(-80%)"
        },
        {
            opacity: 1,
            transform: "translateY(0)"
        }],
        {
            duration: 200,
            easing: "ease-out"
            });
    }
}

let diff = targetTime.getTime() - new Date().getTime();

if (diff > 0) {
    diff /= 1000;
    let seconds = Math.floor(diff % 60, );
    diff /= 60;
    let minutes = Math.floor(diff % 60);
    diff /= 60
    let hours = Math.floor(diff % 24);
    diff /= 24;
    let days = Math.floor(diff);

    init(0, seconds % 10, seconds == 42);
    init(1, Math.floor(seconds / 10), seconds == 42);
    init(2, minutes % 10, minutes == 42);
    init(3, Math.floor(minutes / 10), minutes == 42);
    init(4, hours % 10, hours == 42);
    init(5, Math.floor(hours / 10), hours == 42);
    init(6, days % 10, days == 42);
    init(7, Math.floor(days / 10), days == 42);
}

let intId = setInterval(() => {
    let diff = targetTime.getTime() - new Date().getTime();
    if (diff < 0) {
        diff = 0;
        clearInterval(intId);
    }

    diff /= 1000;
    let seconds = Math.floor(diff % 60);
    diff /= 60;
    let minutes = Math.floor(diff % 60);
    diff /= 60
    let hours = Math.floor(diff % 24);
    diff /= 24;
    let days = Math.floor(diff);

    update(0, seconds % 10, seconds == 42);
    update(1, Math.floor(seconds / 10), seconds == 42);
    update(2, minutes % 10, minutes == 42);
    update(3, Math.floor(minutes / 10), minutes == 42);
    update(4, hours % 10, hours == 42);
    update(5, Math.floor(hours / 10), hours == 42);
    update(6, days % 10, days == 42);
    update(7, Math.floor(days / 10), days == 42);
}, 1000);