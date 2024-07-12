let all_values = [];

Array.from(document.getElementsByTagName("tbody")[0].children).forEach(child => all_values.push(child.textContent.split("\n").map(a => a.trim()).filter(a => a)));

let parsed = all_values.map(val => {
    let [technology, speed] = val[3].split("-")
    return {
        cost: parseInt(val[0].slice(1, val[0].length-4).replace(",", "")),
        capacity: parseInt(val[2].slice(0, val[2].length-2)),
        membw: parseInt(speed)*8,
        technology,
    };
});

