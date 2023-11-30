const scrollPositionsMap = {};

window.navigation.addEventListener("navigate", async (evt) => {
  const source = location.href;
  if (!source.includes("/status/")) return;
  scrollPositionsMap[source] = window.scrollY;

  const destination = evt.destination.url;
  if (!(destination in scrollPositionsMap)) return;

  // now we know the user has navigated from one tweet page to another

  const origReplyTarget = getReplyTargetTweet();
  await waitUntilPageChange(origReplyTarget);
  scrollTo({ left: 0, top: scrollPositionsMap[destination] });

  // TODO: highlight tweet user was just seeing
});

// helpers

async function waitUntilPageChange(origReplyTarget) {
  do {
    await delayMs(50);
  } while (getReplyTargetTweet() === origReplyTarget);
}

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function getTweetTime(tweetNode) {
  return tweetNode.querySelector("time").attributes["datetime"].value;
}

function getTweetAuthor(tweetNode) {
  const avatarUrl = tweetNode
    .querySelector('div[data-testid="Tweet-User-Avatar"]')
    .querySelector("img").src;

  const userDetailsContainer = tweetNode.querySelector(
    'div[data-testid="User-Name"]'
  );
  const name = userDetailsContainer.firstChild.querySelector("a").innerText;
  const username =
    userDetailsContainer.firstChild.nextElementSibling.querySelector(
      "a"
    ).innerText;

  return {
    name,
    username,
    avatarUrl,
  };
}

function getTweetDetails(tweetNode) {
  return {
    author: getTweetAuthor(tweetNode),
    ariaLabel: getTweetAriaLabel(tweetNode),
    time: getTweetTime(tweetNode),
    text: getTweetText(tweetNode),
  };
}

function tweetsAreSame(tweetNodeA, tweetNodeB) {
  const a = getTweetDetails(tweetNodeA);
  const b = getTweetDetails(tweetNodeB);
  return a.author.username === b.author.username && a.time === b.time;
}
