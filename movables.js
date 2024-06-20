//
// FINDME
//
const reset = () => {
    let findme = document.getElementById("findme");
    let findme_dad = document.getElementById("findme_dad");
    let old_text = findme.textContent;
    findme_dad.removeChild(findme);

    var findme_new = document.createElement("span")
    findme_new.id = "findme";
    findme_new.style.position = "absolute";
    findme_new.textContent = old_text;
    findme_dad.appendChild(findme_new);
    findme_new.onmousemove = mousemove;
};

let clearable;
var mousemove = e => {
    clearTimeout(clearable);
    clearable = setTimeout(reset, 1000);

    e.movementX
    findme.style.left = `${e.clientX+(e.movementX > 0 ? 30 : -30)}px`;
    findme.style.top = `${e.clientY+(e.movementY > 0 ? 30 : -30)}px`;
}
findme.onmousemove = mousemove;

//
// NAMES
//
let names = ["Sophia", "Chrysanthemum", "Fork", "$DEADNAME", "cis_female", "computegorl", "the_great_magician", "girl.surgery", "me"]
let mouseover = e => {
    let idx = Math.floor(Math.random()*names.length);
    Array.from(document.getElementsByClassName("name")).forEach(n => n.textContent = names[idx]);
    document.getElementById("email").href = `mailto:${names[idx]}@girl.surgery`
}
Array.from(document.getElementsByClassName("name")).forEach(n => n.onmouseover = mouseover);
setInterval(mouseover, 15000);

//
// BLOG POST
//
const shmem_interpolation_count = 100;
let prev_pos = [0, 0];
let next_pos = [500, 500];
let shmem_idx = 0;
let fixed = false;
let shmem = document.getElementById("shmem");
shmem.onmouseenter = () => fixed = true;
shmem.onmouseleave = () => fixed = false;
setInterval(() => {
    if (shmem_idx == 0) {
        shmem.style.display = "inline";
    }
    if (fixed) { return; }
    let shmem_idx_interp = (shmem_idx % shmem_interpolation_count);
    if ((shmem_idx_interp % shmem_interpolation_count) == 0) {
        prev_pos = next_pos;
        next_pos = [Math.floor(Math.random()*500), Math.floor(Math.random()*500)];
    }
    let shmem_fraction = shmem_idx_interp/shmem_interpolation_count;
    shmem.style.top = prev_pos[0]*(1-shmem_fraction)+next_pos[0]*shmem_fraction;
    shmem.style.left = prev_pos[1]*(1-shmem_fraction)+next_pos[1]*shmem_fraction;
    let [r, g, b] = interpolateColors([[255, 0, 0], [0, 255, 0]], shmem_fraction);
    shmem.style.color = `rgb(${r}, ${g}, ${b})`;
    shmem_idx += 1;
}, 16);