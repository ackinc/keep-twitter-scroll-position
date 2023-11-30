const scrollPositionsMap = {};

window.navigation.addEventListener("navigate", (evt) => {
  const source = location.href;
  if (!source.includes("status")) return;
  scrollPositionsMap[source] = window.scrollY;

  const destination = evt.destination.url;
  if (destination in scrollPositionsMap) {
    delayMs(1000).then(() =>
      scrollTo({
        left: 0,
        top: scrollPositionsMap[destination],
        // behavior: "smooth",
      })
    );
  }
});

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
