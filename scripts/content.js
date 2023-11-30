// PROBLEMS:
// 1. scroll position should only be restored on backwards navigation,
//      not forwards navigation
// 2. page doesn't scroll when navigating away from a tweet whose replies
//      have been restricted by the author

const ENABLE_DEBUG_LOGGING = 0;

const scrollPositionsMap = {};
window.navigation.addEventListener("navigate", handleNavigation);
if (ENABLE_DEBUG_LOGGING) console.log("content script loaded");

async function handleNavigation(event) {
  const source = location.href;
  if (!source.includes("/status/")) return;
  scrollPositionsMap[source] = window.scrollY;

  const destination = event.destination.url;
  if (!(destination in scrollPositionsMap)) return;

  // now we know the user has navigated from one tweet page to another

  const origReplyTarget = getReplyTargetTweet();
  await waitUntilPageChange(origReplyTarget);
  scrollTo({ left: 0, top: scrollPositionsMap[destination] });

  // highlight tweet user was just seeing
  await waitUntilThereAreVisibleTweets();
  const dataOfTweetToHighlight = getTweetDetails(origReplyTarget);
  const tweetToHighlight = findTweetInVisibleArea(dataOfTweetToHighlight);
  if (tweetToHighlight) await highlightTweet(tweetToHighlight);
  else {
    if (ENABLE_DEBUG_LOGGING) console.log(`Failed to find tweet to highlight`);
  }
}

// twitter-specific helpers

async function highlightTweet(tweetNode) {
  tweetNode.style.transition = "background-color 250ms linear";

  const origBgColor = tweetNode.style.backgroundColor;

  tweetNode.style.backgroundColor = "bisque";

  await delayMs(2000);
  tweetNode.style.backgroundColor = origBgColor;
}

async function waitUntilPageChange(origReplyTarget) {
  return waitFor(
    () => getReplyTargetTweet() !== origReplyTarget,
    "checkReplyTargetHasChanged"
  );
}

async function waitUntilThereAreVisibleTweets() {
  return waitFor(checkThereAreVisibleTweets, "checkThereAreVisibleTweets");
}

function checkThereAreVisibleTweets() {
  return !!getFirstVisibleTweet();
}

function getReplyTargetTweet() {
  const draftEditor = document.querySelector("div.DraftEditor-root");
  let cellInnerDiv = draftEditor;
  while (cellInnerDiv.attributes["data-testid"]?.value !== "cellInnerDiv") {
    cellInnerDiv = cellInnerDiv.parentNode;
  }
  return cellInnerDiv.querySelector("article");
}

function findTweetInVisibleArea(dataOfTweetToFind) {
  let tweetToCheck = getFirstVisibleTweet();

  while (tweetToCheck && nodeIsVisible(tweetToCheck)) {
    const dataOfTweetToCheck = getTweetDetails(tweetToCheck);
    if (checkTweetsAreSame(dataOfTweetToCheck, dataOfTweetToFind)) {
      return tweetToCheck;
    }

    tweetToCheck = getNextTweetOnPage(tweetToCheck);
  }

  return null;
}

// WARN: actually only checks if top of node is visible
function nodeIsVisible(node) {
  const rect = node.getBoundingClientRect();
  return rect.top > 0 && rect.top < window.innerHeight;
}

function getFirstVisibleTweet() {
  const pointToCheck = {
    x: window.innerWidth / 2,
    // looking a bit below the top of the screen to clear the "go back"
    //   element that twitter has fixed to the top
    y: 60,
  };

  let elemAtTopOfPage = document.elementFromPoint(
    pointToCheck.x,
    pointToCheck.y
  );
  elemAtTopOfPage = getNearestCellInnerDivAncestor(elemAtTopOfPage);
  if (elemAtTopOfPage === null) return null;

  const foundTweet = elemAtTopOfPage.querySelector("article");

  return nodeIsVisible(foundTweet)
    ? foundTweet
    : getNextTweetOnPage(foundTweet);
}

function getNextTweetOnPage(tweetNode) {
  let cellInnerDiv = getNearestCellInnerDivAncestor(tweetNode);
  if (cellInnerDiv === null) return null;

  let nextTweet;
  while (!nextTweet) {
    cellInnerDiv = cellInnerDiv.nextElementSibling;
    if (!cellInnerDiv) return null;

    nextTweet = cellInnerDiv.querySelector("article");
  }

  return nextTweet;
}

function getNearestCellInnerDivAncestor(node) {
  while (!nodeIsCellInnerDiv(node)) {
    node = node.parentNode;
    if (node === null) return null;
  }
  return node;
}

function nodeIsCellInnerDiv(node) {
  return node.attributes?.["data-testid"]?.value === "cellInnerDiv";
}

function getTweetText(tweetNode) {
  return (
    tweetNode.querySelector('div[data-testid="tweetText"]')?.innerText ?? ""
  );
}

function getTweetTime(tweetNode) {
  return tweetNode.querySelector("time").attributes["datetime"].value;
}

function getTweetAuthor(tweetNode) {
  const userDetailsContainer = tweetNode.querySelector(
    'div[data-testid="User-Name"]'
  );
  const name = userDetailsContainer.firstChild.querySelector("a").innerText;
  const username =
    userDetailsContainer.firstChild.nextElementSibling.querySelector(
      "a"
    ).innerText;

  return { name, username };
}

function getTweetDetails(tweetNode) {
  return {
    author: getTweetAuthor(tweetNode),
    time: getTweetTime(tweetNode),
    text: getTweetText(tweetNode),
  };
}

function checkTweetsAreSame(tweetDataA, tweetDataB) {
  return (
    tweetDataA.author.username === tweetDataB.author.username &&
    tweetDataA.time === tweetDataB.time
  );
}

// generic helpers

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predFn, name) {
  const MAX_TRIES = 20;
  const DELAY_BETWEEN_TRIES_MS = 50;

  const loggingPrefix = `waitFor${name ? `: ${name}` : ""}`;
  let nTries = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (predFn()) break;

    nTries++;
    if (nTries >= MAX_TRIES) {
      throw new Error(`${loggingPrefix}: max tries exceeded`);
    }

    if (ENABLE_DEBUG_LOGGING) console.log(`${loggingPrefix}: waiting ...`);
    await delayMs(DELAY_BETWEEN_TRIES_MS);
  }
}
