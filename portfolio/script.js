const pages = {
  about: {
    title: "Hello, I'm Anabia! ✨",
    text: "I'm a curious student who loves technology, creativity and discovering how things work. I'm particularly interested in computer science, physics and engineering."
  },

  projects: {
    title: "Things I've Created 📓",
    text: "Welcome to my project collection!<br><br>• Virtual Pet — an interactive digital pet.<br>• Research Paper Library — a website for organising research papers.<br>• More experiments and creations coming soon!"
  },

  achievements: {
    title: "Little Victories 🏆",
    text: "Every achievement starts with trying something new.<br><br>• Academic achievements<br>• Programming competitions<br>• MUN and other activities<br><br>More milestones to come!"
  },

  dreams: {
    title: "A Mind Full of Ideas 💡",
    text: "I aspire to study Electrical Engineering, explore robotics and build technology that solves meaningful problems. I want to keep learning, experimenting and creating."
  }
};

function openPage(page) {
  const content = pages[page];

  if (!content) return;

  document.getElementById("popup-content").innerHTML =
    `<h2>${content.title}</h2><p>${content.text}</p>`;

  document.getElementById("overlay").classList.add("show");
}

function closePage() {
  document.getElementById("overlay").classList.remove("show");
}

document.getElementById("overlay").addEventListener("click", function(e) {
  if (e.target === this) closePage();
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closePage();
});