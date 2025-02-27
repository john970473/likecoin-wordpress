/* global jQuery, Web3 */

const CHALLENGE_URL = 'https://api.like.co/api/users/challenge';
let webThreeError = null;
let webThreeInstance = null;

function formatWallet(wallet) {
  if (!wallet) return wallet;
  return `${wallet.substr(0, 6)}...${wallet.substr(38, 4)}`;
}

function show(selector) {
  const elems = document.querySelectorAll(`.likecoin${selector}`);
  elems.forEach((elem) => { elem.style.display = ''; }); // eslint-disable-line no-param-reassign
}

function hide(selector) {
  const elems = document.querySelectorAll(`.likecoin${selector}`);
  elems.forEach((elem) => { elem.style.display = 'none'; }); // eslint-disable-line no-param-reassign
}


function showError(selector) {
  webThreeError = selector;
  const elems = document.querySelectorAll('.likecoin.webThreeError');
  elems.forEach((elem) => { elem.style.display = 'none'; }); // eslint-disable-line no-param-reassign
  show(selector);
}


async function checkForWebThree() {
  if (!window.web3 && !window.ethereum) {
    showError('.needMetaMask');
    console.error('no web3'); // eslint-disable-line no-console
    return false;
  }
  webThreeInstance = new Web3(window.web3.currentProvider);
  return true;
}

async function checkForNetwork() {
  const network = await webThreeInstance.eth.net.getNetworkType();
  if (network !== 'main') {
    showError('.needMainNet');
    console.error('not mainnet'); // eslint-disable-line no-console
    return false;
  }
  return true;
}

async function checkForPermission() {
  if (window.ethereum && window.ethereum.enable) {
    try {
      await window.ethereum.enable();
    } catch (err) {
      showError('.needPermission');
      console.error('no permission'); // eslint-disable-line no-console
      console.error(err); // eslint-disable-line no-console
      return false;
    }
  }
  return true;
}

async function checkForAccount() {
  const accounts = await webThreeInstance.eth.getAccounts();
  if (!accounts || !accounts[0]) {
    showError('.needUnlock');
    console.error('not unlocked'); // eslint-disable-line no-console
    return false;
  }
  const selectedAddress = accounts[0];
  webThreeError = null;
  return webThreeInstance.utils.toChecksumAddress(selectedAddress);
}

async function handleUpdateId({
  user,
  wallet,
  displayName,
  avatar,
}) {
  const likecoinId = document.querySelector('#likecoinId');
  const likecoinWallet = document.querySelector('#likecoinWallet');
  const likecoinDisplayName = document.querySelector('#likecoinDisplayName');
  const likecoinAvatar = document.querySelector('#likecoinAvatar');
  const likecoinPreview = document.querySelector('#likecoinPreview');
  const likecoinIdInput = document.querySelector('input.likecoinId');
  const likecoinDisplayNameInput = document.querySelector('input.likecoinDisplayName');
  const likecoinWalletInput = document.querySelector('input.likecoinWallet');
  const likecoinAvatarInput = document.querySelector('input.likecoinAvatar');
  if (likecoinId) likecoinId.innerHTML = user || '-';
  if (likecoinWallet) likecoinWallet.innerHTML = formatWallet(wallet) || '-';
  if (likecoinDisplayName) likecoinDisplayName.innerHTML = displayName || '-';
  if (likecoinAvatar) likecoinAvatar.src = avatar || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  if (likecoinPreview) likecoinPreview.src = user ? `https://button.like.co/in/embed/${user}/button?type=wp` : 'about:blank';
  if (likecoinIdInput) likecoinIdInput.value = user;
  if (likecoinWalletInput) likecoinWalletInput.value = wallet;
  if (likecoinDisplayNameInput) likecoinDisplayNameInput.value = displayName;
  if (likecoinAvatarInput) likecoinAvatarInput.value = avatar;
  hide('.loginSection');
  show('.optionsSection');
}

async function fetchLikeCoinID(currentAddress) {
  try {
    show('.loading');
    const { challenge } = await jQuery.ajax({ url: `${CHALLENGE_URL}?wallet=${currentAddress}` });
    hide('.loading');
    showError('.needLogin');
    return challenge;
  } catch (err) {
    hide('.loading');
    if ((err || {}).status === 404) showError('.needLikeCoinId');
    throw err;
  }
}

async function login(address) {
  if (!address) {
    throw new Error('cannot get web3 address');
  }
  if (webThreeError && webThreeError !== '.needLogin') {
    throw new Error(webThreeError);
  }
  const challenge = await fetchLikeCoinID(address);
  const signature = await webThreeInstance.eth.personal.sign(challenge, address);
  if (!signature) {
    throw new Error('No signature');
  }
  const body = JSON.stringify({ challenge, signature, wallet: address });
  const res = await fetch(CHALLENGE_URL, {
    body,
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const payload = await res.json();
  const {
    user = '',
    wallet = '',
    displayName = '',
    avatar = '',
  } = payload;
  if (user) {
    handleUpdateId({
      user,
      wallet,
      displayName,
      avatar,
    });
  } else {
    // TODO: Add error msg display to UI
    console.error('Error: user is undefined'); // eslint-disable-line no-console
    console.error(payload); // eslint-disable-line no-console
  }
}

async function onLoginClick() {
  try {
    if (!await checkForWebThree()) return;
    if (!await checkForNetwork()) return;
    if (!await checkForPermission()) return;
    const newAddress = await checkForAccount();
    if (newAddress) {
      await login(newAddress);
    }
  } catch (e) {
    console.error(e); // eslint-disable-line no-console
  }
}

function onLogoutClick() {
  handleUpdateId({
    user: '',
    wallet: '',
    displayName: '',
    avatar: '',
  });
}

(() => {
  const loginBtn = document.querySelector('#likecoinLoginBtn');
  const changeBtn = document.querySelector('#likecoinChangeBtn');
  const logoutBtn = document.querySelector('#likecoinLogoutBtn');
  if (loginBtn) loginBtn.addEventListener('click', onLoginClick);
  if (changeBtn) changeBtn.addEventListener('click', onLoginClick);
  if (logoutBtn) logoutBtn.addEventListener('click', onLogoutClick);
  checkForWebThree({ slient: true });
})();
