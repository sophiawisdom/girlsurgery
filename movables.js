//
// NAMES
//
let mouse_interval = null;
let names = ["Sophia", "Chrysanthemum", "Fork", "$DEADNAME", "cis_female", "computergorl", "the_great_magician", "girl.surgery", "me", "Sophirot", "Ein Sof", "Big Soph", "🍴🥬🧠", "stoggily", "sophiawisdom"];
let mouseover = e => {
    let idx = Math.floor(Math.random()*names.length);
    Array.from(document.getElementsByClassName("name")).forEach(n => n.textContent = names[idx]);
    clearInterval(mouse_interval);
    mouse_interval = setInterval(mouseover, 15000);
    Array.from(document.getElementsByClassName("email")).forEach(mail => {
        mail.href = `mailto:${names[idx]}@girl.surgery`;
    });
}

Array.from(document.getElementsByClassName("email")).forEach(mail => {
    mail.href = `mailto:sophia@girl.surgery`;
});

Array.from(document.getElementsByClassName("name")).forEach(n => n.onmouseover = mouseover);
mouse_interval = setInterval(mouseover, 30000);

function interpolateColors(colors, fraction) {
    let labs = colors.map(rgb => rgbToLab(rgb));
    let resultLab = [
        labs[0][0] * (1-fraction) + labs[1][0] * fraction,
        labs[0][1] * (1-fraction) + labs[1][1] * fraction,
        labs[0][2] * (1-fraction) + labs[1][2] * fraction
];

    return labToRgb(resultLab);
}

//
// BLOG POST
//
let shmem = document.getElementById("shmem");
if (shmem) {
const shmem_interpolation_count = 100;
let prev_pos = [0, 0];
let next_pos = [500, 500];
let shmem_idx = 0;
let fixed = false;
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
}
