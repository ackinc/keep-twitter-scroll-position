const scrollPositionsMap = {};

window.navigation.addEventListener("navigate", async (evt) => {
  const source = location.href;
  if (!source.includes("/status/")) return;
  scrollPositionsMap[source] = window.scrollY;

  const destination = evt.destination.url;
  if (destination in scrollPositionsMap) {
    await waitUntilPageChange();
    scrollTo({
      left: 0,
      top: scrollPositionsMap[destination],
      // behavior: "smooth",
    });
  }
});

async function waitUntilPageChange() {
  const origReplyTarget = getReplyTargetTweet();
  let curReplyTarget;

  do {
    await delayMs(50);
    curReplyTarget = getReplyTargetTweet();
  } while (curReplyTarget === origReplyTarget);
}

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFirstTweet() {
  return document
    .querySelector('div[aria-label="Timeline: Conversation"]')
    .querySelector("article");
}

function getReplyTargetTweet() {
  const draftEditor = document.querySelector("div.DraftEditor-root");
  let cellInnerDiv = draftEditor;
  while (cellInnerDiv.attributes["data-testid"]?.value !== "cellInnerDiv") {
    cellInnerDiv = cellInnerDiv.parentNode;
  }
  return cellInnerDiv.querySelector("article");
}

function getTweetText(tweetNode) {
  return tweetNode.querySelector('div[data-testid="tweetText"]').innerText;
}

function getTweetAriaLabel(tweetNode) {
  return tweetNode.attributes["aria-labelledby"].value;
}
