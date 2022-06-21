// UI
investmentAmount = $('*[data-field="investment-amount"]');

connectWalletButton = $('*[data-action="connect-wallet"]');
copyRefLinkButton = $('*[data-action="copy-referral"]');
investButton = $('*[data-action="invest"]');
withdrawButton = $('*[data-action="withdraw"]');
reinvestButton = $('*[data-action="reinvest"]');

// Constants
const web3modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;

class DApp {
    web3modal;
    web3;
    provider;
    mainLoop;
    buttonsDisabled = true;
    timerFetcher;
    timerUpdater;

    providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                rpc: {
                    56: 'https://bsc-dataseed.binance.org/'
                },
                network: 'binance',
                // chainId: 97,
                infuraId: 'd85fda7b424b4212ba72f828f48fbbe1',
                pollingInterval: '10000'
            }
        }
    }

    userObject = {
        addr: null,
        currentChain: null,
        hives: '0',
        dailyProfit: '0',
        rewards: '0',
        lastHatch: '0',
        cutOffStep: '0',
        mandatoryReinvestments: '0',
        reinvestments: '0',
        minInvestment: '0',
        deposit: '0',
        depositLimit: '0',
        referrals: '0',
        referralRewards: '0',
        tvl: '0',
        totalDeposits: '0',
        totalReferralRewards: '0',
        totalStaked: '0',
        withdrawCooldown: '0',
        compoundStep: '0',
        compoundBonus: '0',
        withdrawTax: '0'
    }

    userObjectNull = {...this.userObject};

    contractObject = {
        abi_path: null,
        abi: null,
        address: null,
        web3contract: null,
        chain: null,
        owner: null
    }


    constructor(contract_address, abi_path, supported_chain) {
        this.contractObject.abi_path = abi_path;
        this.contractObject.address = contract_address;
        this.contractObject.chain = supported_chain;

        this.web3modal = new web3modal({
            network: "binance", // optional
            cacheProvider: true, // optional
            providerOptions: this.providerOptions
        });

        // Connect wallet automatically if there is a cached provider
        if (this.web3modal.cachedProvider) {
            this.ConnectWallet();
        }

        this.GetRef();
        console.log(`Referrer: ${this.userObject.referrer}`);
    }

    async Compound(callback) {
        this.contractObject.web3contract.methods.buildMoreHives(true).send({from: this.userObject.addr})
            .on('transactionHash', (hash) => {
                console.log('Transaction Hash: ', hash);
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-plus',
                    title: 'Transaction!',
                    message: `Transaction Hash: ${utils.truncateAddress(hash)}`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'blue',
                });
            })
            .on('receipt', () => {
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-plus',
                    title: 'Success!',
                    message: `Transaction Received`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'green',
                });
                this.FetchUserData();
                this.UpdateFields();
                callback();
            })
            .on('error', (error, receipt) => {
                this.FetchUserData();
                console.log('Error receipt: ', receipt)
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-xmark',
                    title: 'Rejected!',
                    message: `Transaction Rejected!`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'red',
                });
                callback();
            });
    }

    async Withdraw(callback) {
        this.contractObject.web3contract.methods.sellHoney().send({from: this.userObject.addr})
            .on('transactionHash', (hash) => {
                console.log('Transaction Hash: ', hash);
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-plus',
                    title: 'Transaction!',
                    message: `Transaction Hash: ${utils.truncateAddress(hash)}`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'blue',
                });
            })
            .on('receipt', () => {
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-plus',
                    title: 'Success!',
                    message: `Transaction Received`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'green',
                });
                this.FetchUserData();
                this.UpdateFields();
                callback();
            })
            .on('error', (error, receipt) => {
                this.FetchUserData();
                console.log('Error receipt: ', receipt)
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-xmark',
                    title: 'Rejected!',
                    message: `Transaction Rejected!`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'red',
                });
                callback();
            });
    }

    async ProcessBuildHivesForm() {
        const buildHives = investButton;
        const value = investmentAmount.val();
        const isActive = parseInt(await this.contractObject.web3contract.methods.getBalance().call()) !== 0;

        if (!isActive) {
            iziToast.show({
                theme: 'dark',
                icon: 'fa-solid fa-hand',
                title: 'Error!',
                message: `Contract is not activated yet`,
                position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                progressBarColor: 'red',
            });
        } else if (!value) {
            iziToast.show({
                theme: 'dark',
                icon: 'fa-solid fa-hand',
                title: 'Error!',
                message: `Input the investment amount in BNB`,
                position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                progressBarColor: 'red',
            });
        } else if (parseInt(this.userObject.minInvestment) > Web3.utils.toWei(value, 'ether')) {
            // The amount is too small
            iziToast.show({
                theme: 'dark',
                icon: 'fa-solid fa-hand',
                title: 'Error!',
                message: `Minimal deposit: ${Web3.utils.fromWei(this.userObject.minInvestment, 'ether')} BNB`,
                position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                progressBarColor: 'red',
            });
        } else if (parseInt(Web3.utils.toWei(value, 'ether')) + parseInt(this.userObject.deposit) > parseInt(this.userObject.depositLimit)) {
            iziToast.show({
                theme: 'dark',
                icon: 'fa-solid fa-hand',
                title: 'Error!',
                message: `Max deposit per wallet: ${Web3.utils.fromWei(this.userObject.depositLimit, 'ether')} BNB`,
                position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                progressBarColor: 'red',
            });
        } else {
            console.log(this.userObject.depositLimit, this.userObject.deposit, Web3.utils.toWei(value, 'ether'), this.userObject.minInvestment);
            // Buy
            buildHives.addClass('processing');
            buildHives.off();

            await this.BuildHives(() => {
                buildHives.removeClass('processing');
                buildHives.off();
                buildHives.click(async () => {
                    await this.ProcessBuildHivesForm();
                });
            }, value)
        }
    }

    async BuildHives(callback, value) {
        this.GetRef();
        console.log('REF', this.userObject.referrer);
        this.contractObject.web3contract.methods.buildHives(this.userObject.referrer).send(
            {
                from: this.userObject.addr,
                value: Web3.utils.toWei((value).toString(), "ether"),
            }
        )
            .on('transactionHash', (hash) => {
                console.log('REF', this.userObject.referrer);
                console.log('Transaction Hash: ', hash);
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-plus',
                    title: 'Transaction!',
                    message: `Transaction Hash: ${utils.truncateAddress(hash)}`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'blue',
                });
            })
            .on('receipt', () => {
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-plus',
                    title: 'Success!',
                    message: `Transaction Received`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'green',
                });
                this.FetchUserData();
                this.UpdateFields();
                callback();
            })
            .on('error', (error, receipt) => {
                this.FetchUserData();
                console.log('Error receipt: ', receipt)
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-file-circle-xmark',
                    title: 'Rejected!',
                    message: `Transaction Rejected!`,
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'red',
                });
                callback();
            });
    }

    async UpdateFields() {
        // Time UTC
        const now = new Date().getTime() / 1000;

        // User Block
        const myHives = $('*[data-field="my-hives"]');
        const dailyProfit = $('*[data-field="daily-profit"]');
        const rewards = $('*[data-field="rewards"]');
        const fillingTime = $('*[data-field="filling-time"]');
        const compounds = $('*[data-field="compounds"]');
        const compoundBonus = $('*[data-field="compound-bonus"]');


        // Referral Block
        const referrals = $('*[data-field="referrals"]');
        const referralRewards = $('*[data-field="referral-rewards"]');

        // Stats Block
        const tvl = $('*[data-field="tvl"]');
        const totalDeposits = $('*[data-field="total-deposits"]');
        const totalReferralRewards = $('*[data-field="total-referral-rewards"]');
        const totalStaked = $('*[data-field="total-staked"]');

        // User Block
        myHives.text(`${(parseInt(this.userObject.hives)).toLocaleString()} Hives`);
        dailyProfit.text(`${parseFloat(Web3.utils.fromWei(this.userObject.dailyProfit, 'ether')).toFixed(4)} BNB`);
        rewards.text(`${parseFloat(Web3.utils.fromWei(this.userObject.rewards, 'ether')).toFixed(4)} BNB`);

        if ((parseInt(this.userObject.lastHatch) + parseInt(this.userObject.cutOffStep)) <= now)
            fillingTime.text('00:00:00');
        else
            fillingTime.text(utils.ConvertSecToTime((parseInt(this.userObject.lastHatch) + parseInt(this.userObject.cutOffStep)) - now));


        compounds.text(`${this.userObject.reinvestments} / ${this.userObject.mandatoryReinvestments}`);

        referrals.text(`${(parseInt(this.userObject.referrals)).toLocaleString()}`);
        referralRewards.text(`${parseFloat(Web3.utils.fromWei(this.userObject.referralRewards, 'ether')).toFixed(4)} BNB`);

        // Stats Block
        tvl.text(`${parseFloat(Web3.utils.fromWei(this.userObject.tvl, 'ether')).toFixed(2)} BNB`);
        totalDeposits.text(this.userObject.totalDeposits);
        totalReferralRewards.text(`${parseFloat(Web3.utils.fromWei(this.userObject.totalReferralRewards, 'ether')).toFixed(2)} BNB`);
        totalStaked.text(`${parseFloat(Web3.utils.fromWei(this.userObject.totalStaked, 'ether')).toFixed(2)} BNB`);

        // Withdraw Button
        withdrawButton.off();
        const withdrawButtonStatus = withdrawButton.find('*[data-field="sell-status"]');
        const withdrawButtonTimeLock = withdrawButton.find('.time-lock');
        if (parseInt(this.userObject.lastHatch) + parseInt(this.userObject.withdrawCooldown) > now) {
            // if timer -> show lock, show timer
            withdrawButton.addClass('disabled');
            withdrawButtonTimeLock.removeClass('hidden');
            withdrawButtonStatus.removeClass('hidden');
            withdrawButtonStatus.text(utils.ConvertSecToTime(parseInt(this.userObject.lastHatch) + parseInt(this.userObject.withdrawCooldown) - now))
        } else if (parseInt(this.userObject.hives) > 0) {
            // if NOT timer -> hide lock, show tax
            withdrawButtonTimeLock.addClass('hidden');
            if (parseInt(this.userObject.reinvestments) < parseInt(this.userObject.mandatoryReinvestments))
                withdrawButtonStatus.text(`-${parseInt(this.userObject.withdrawTax) / 10}%`);
            else
                withdrawButtonStatus.addClass('hidden');
            // withdrawButtonStatus.text(`${(parseInt(this.userObject.reinvestments) * parseInt(this.userObject.compoundBonus)) / 10}%`);
            withdrawButton.removeClass('disabled');
            withdrawButton.click(() => {
                withdrawButton.addClass('processing');
                withdrawButton.off();
                this.Withdraw(() => {
                    withdrawButton.removeClass('processing')
                });
            })
        } else {
            withdrawButton.addClass('disabled');
            withdrawButtonTimeLock.removeClass('hidden');
            withdrawButtonStatus.text('--:--:--');
        }


        reinvestButton.off();
        const reinvestButtonStatus = reinvestButton.find('*[data-field="reinvest-status"]');
        const reinvestButtonTimeLock = reinvestButton.find('.time-lock');
        if (parseInt(this.userObject.lastHatch) + parseInt(this.userObject.compoundStep) > now) {
            // if timer -> show lock, show timer
            reinvestButton.addClass('disabled');
            reinvestButtonTimeLock.removeClass('hidden');
            reinvestButtonStatus.text(utils.ConvertSecToTime(parseInt(this.userObject.lastHatch) + parseInt(this.userObject.compoundStep) - now))

            if (parseInt(this.userObject.reinvestments) > parseInt(this.userObject.maxReinvestments))
                compoundBonus.text(`+${(parseInt(this.userObject.maxReinvestments) * parseInt(this.userObject.compoundBonus)) / 10}%`);
            else
                compoundBonus.text(`+${(parseInt(this.userObject.reinvestments) * parseInt(this.userObject.compoundBonus)) / 10}%`);
        } else if (parseInt(this.userObject.hives) > 0) {
            // if NOT timer -> hide lock, show bonus
            reinvestButtonTimeLock.addClass('hidden');
            if (parseInt(this.userObject.reinvestments) > parseInt(this.userObject.maxReinvestments))
                reinvestButtonStatus.text(`+${(parseInt(this.userObject.maxReinvestments) * parseInt(this.userObject.compoundBonus)) / 10}%`);
            else
                reinvestButtonStatus.text(`+${(parseInt(this.userObject.reinvestments) * parseInt(this.userObject.compoundBonus)) / 10}%`);

            reinvestButton.removeClass('disabled');
            reinvestButton.click(() => {
                reinvestButton.addClass('processing');
                reinvestButton.off();
                this.Compound(() => {
                    reinvestButton.removeClass('processing')
                });
            })
        } else {
            reinvestButton.addClass('disabled');
            reinvestButtonTimeLock.removeClass('hidden');
            reinvestButtonStatus.text('--:--:--');
        }

        // Update Harvest Honey Data
        clearInterval(this.timerUpdater);
        this.timerUpdater = setInterval(() => {
            this.UpdateFields();
        }, 1000);
    }

    async FetchUserData() {
        // Fetch data only if wallet connected and contract exists
        if (this.userObject.addr && this.contractObject.web3contract) {
            // Fetch and assign new data to userObject

            // Fetch Apiary Data
            let fetched_user_data = await this.contractObject.web3contract.methods.getUserInfo(this.userObject.addr).call({
                from: this.userObject.addr
            });
            let fetched_contract_data = await this.contractObject.web3contract.methods.getSiteInfo().call({
                from: this.userObject.addr
            });


            // Hives amount
            this.userObject.hives = fetched_user_data._miners;

            // Daily profit
            if (parseInt(this.userObject.hives) > 0)
                this.userObject.dailyProfit = await this.contractObject.web3contract.methods.calculateEggSellForYield((parseInt(this.userObject.hives) * 24 * 60 * 60).toString(), Web3.utils.toWei('1')).call();
            else
                this.userObject.dailyProfit = '0';

            // Filling time
            this.userObject.lastHatch = fetched_user_data._lastHatch;
            this.userObject.cutOffStep = await this.contractObject.web3contract.methods.CUTOFF_STEP().call();

            // Rewards
            let honey = await this.contractObject.web3contract.methods.getEggsSinceLastHatch(this.userObject.addr).call();
            if (parseInt(honey) > 0)
                this.userObject.rewards = await this.contractObject.web3contract.methods.getAvailableEarnings(this.userObject.addr).call();
            else
                this.userObject.rewards = '0';

            // Compounds
            this.userObject.mandatoryReinvestments = await this.contractObject.web3contract.methods.COMPOUND_FOR_NO_TAX_WITHDRAWAL().call();
            this.userObject.reinvestments = fetched_user_data._dailyCompoundBonus;
            this.userObject.maxReinvestments = await this.contractObject.web3contract.methods.COMPOUND_BONUS_MAX_TIMES().call();

            // Referrals
            this.userObject.referrals = fetched_user_data._referrals;
            this.userObject.referralRewards = fetched_user_data._referralEggRewards;

            // Contract data
            this.userObject.tvl = await this.contractObject.web3contract.methods.getBalance().call();
            this.userObject.totalDeposits = fetched_contract_data._totalDeposits;
            this.userObject.totalReferralRewards = fetched_contract_data._totalRefBonus;
            this.userObject.totalStaked = fetched_contract_data._totalStaked;

            // Data for buttons
            this.userObject.withdrawCooldown = await this.contractObject.web3contract.methods.WITHDRAW_COOLDOWN().call();
            this.userObject.compoundStep = await this.contractObject.web3contract.methods.COMPOUND_STEP().call();
            this.userObject.compoundBonus = await this.contractObject.web3contract.methods.COMPOUND_BONUS().call();
            this.userObject.withdrawTax = await this.contractObject.web3contract.methods.WITHDRAWAL_TAX().call();
            this.userObject.minInvestment = await this.contractObject.web3contract.methods.MIN_INVEST_LIMIT().call();
            this.userObject.deposit = fetched_user_data._initialDeposit;
            this.userObject.depositLimit = await this.contractObject.web3contract.methods.WALLET_DEPOSIT_LIMIT().call()


            // Fetch Harvest Honey Data
            clearInterval(this.timerFetcher);
            this.timerFetcher = setInterval(() => {
                this.FetchUserData();
                this.UpdateFields();
            }, 10000);
        }

        // Update HTML elements
        await this.UpdateFields();
    }

    async _ResetUserData() {
        this.userObject = {...this.userObjectNull};
    }

    async CopyReferralLink() {
        await navigator.clipboard.writeText(`${window.location.hostname}/?ref=${this.userObject.addr}`);
        iziToast.show({
            theme: 'dark',
            icon: 'fa-solid fa-copy',
            title: 'Copied!',
            message: 'Your Referral link was copied!',
            position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
            progressBarColor: 'blue',
        });
    }

    async ToggleButtons(state) {
        // connectWalletButton = $('*[data-action="connect-wallet"]');
        // copyRefLinkButton = $('*[data-action="copy-referral"]');
        // investButton = $('*[data-action="invest"]');
        // withdrawButton = $('*[data-action="withdraw"]');
        // reinvestButton = $('*[data-action="reinvest"]');

        // Force buttons to change their state to the needed one
        switch (state) {
            case "on":
                if (this.buttonsDisabled) {
                    const walletAddr = connectWalletButton.find('.button-text');
                    const walletClose = connectWalletButton.find('.disconnect-icon');
                    walletClose.removeClass('hidden');
                    walletAddr.text(utils.truncateAddress(this.userObject.addr));

                    copyRefLinkButton.removeClass('disabled');
                    copyRefLinkButton.click(async () => {
                        await this.CopyReferralLink();
                    });

                    investButton.removeClass('disabled');
                    investButton.click(async () => {
                        await this.ProcessBuildHivesForm();
                    });

                    utils.colorLog('Buttons activated', 'info');
                    this.buttonsDisabled = false;
                }
                break;
            case "off":
                if (!this.buttonsDisabled) {
                    const walletAddr = connectWalletButton.find('.button-text');
                    const walletClose = connectWalletButton.find('.disconnect-icon');
                    walletClose.addClass('hidden');
                    walletAddr.text('Connect Wallet');

                    copyRefLinkButton.off();
                    copyRefLinkButton.addClass('disabled');

                    investButton.off();
                    investButton.addClass('disabled');

                    withdrawButton.off();
                    withdrawButton.addClass('disabled');

                    reinvestButton.off();
                    reinvestButton.addClass('disabled');
                    utils.colorLog('Buttons disabled', 'info');
                    this.buttonsDisabled = true;
                }
                break;
            default:
                break;
        }
    }

    async ChainSupported() {
        return parseInt(await this.web3.eth.getChainId()) === this.contractObject.chain;
    }

    SwitchNetwork() {
        this.web3.currentProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{chainId: Web3.utils.toHex(this.contractObject.chain)}],
        }).then(() => {
            iziToast.show({
                theme: 'dark',
                icon: 'fa-solid fa-thumbs-up',
                title: 'Success!',
                message: 'Chain changed',
                position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                progressBarColor: 'green',
            });
        }).catch((error) => {
            if (error.code === 4902) {
                this.web3.currentProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x38',
                        chainName: 'Binance Smart Chain',
                        nativeCurrency: {
                            name: 'Binance Coin',
                            symbol: 'BNB',
                            decimals: 18
                        },
                        rpcUrls: ['https://bsc-dataseed.binance.org/'],
                        blockExplorerUrls: ['https://bscscan.com']
                    }]
                }).then(() => {
                    iziToast.show({
                        theme: 'dark',
                        icon: 'fa-solid fa-thumbs-up',
                        title: 'Success!',
                        message: 'BSC successfully added!',
                        position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                        progressBarColor: 'green',
                    });
                });
            }
        });
    }

    async ProcessConnection() {
        // Get user's active account
        let accounts = await this.web3.eth.getAccounts();
        this.userObject.addr = accounts[0];

        if (!this.userObject.addr) {
            await this.HandleEvent('disconnect');
        } else {
            // If selected chain is not supported
            if (!await this.ChainSupported()) {
                utils.colorLog('Chain is not supported', 'error');

                // Reference to the parent object to be used in nested function
                let dapp_class_ref = this;
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-hand',
                    title: 'Warning',
                    message: 'Change your network to BSC',
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'red',
                    buttons: [
                        ['<button>Change network</button>', function (instance, toast) {
                            dapp_class_ref.SwitchNetwork();
                            instance.hide({
                                transitionOut: 'fadeOut',
                            }, toast);
                        }, true], // true to focus
                    ],
                });
            } else {
                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-clock',
                    title: 'Connecting...',
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'blue',
                });

                await this.ConnectToContract();

                await this.FetchUserData();

                iziToast.show({
                    theme: 'dark',
                    icon: 'fa-solid fa-thumbs-up',
                    title: 'Success!',
                    message: 'Successfully connected',
                    position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                    progressBarColor: 'green',
                });
            }
        }
    }

    async HandleEvent(event, payload = null) {
        //console.log(`Event received:\n\nEvent: ${event} payload: ${payload}`, "info");
        utils.colorLog(`Event: ${event} \nPayload: ${payload}`, "info");

        switch (event) {
            case "connect":
                // if connected
                if (this.web3modal.cachedProvider) {
                    await this.ProcessConnection();
                    await this.ToggleButtons('on');

                    console.log('UserObject:', this.userObject);

                    clearInterval(this.mainLoop);
                    this.mainLoop = setInterval(async () => {
                        if (await this.ChainSupported()) {
                            await this.FetchUserData();
                            await this.UpdateFields();
                        }
                    }, 5000);
                    await this.ToggleButtons('on');
                }
                break;
            case "disconnect":
                // Make buttons inactive
                this.web3modal.clearCachedProvider();
                await this.ToggleButtons('off');

                // Clear update loop
                clearInterval(this.mainLoop);

                this._ResetUserData().then(async () => {
                    iziToast.show({
                        theme: 'dark',
                        icon: 'fa-solid fa-thumbs-up',
                        title: 'Disconnected!',
                        message: 'Successfully disconnected',
                        position: 'topCenter', // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
                        progressBarColor: 'blue',
                    });
                    await this.UpdateFields();
                });
                break;
            case "accountsChanged":
                if (this.web3modal.cachedProvider) {
                    await this.ProcessConnection();
                }
                break;
            case "chainChanged":
                if (this.web3modal.cachedProvider) {
                    await this.ProcessConnection();
                }
                break;
            default:
                await this.UpdateFields();
                break;
        }

        await this.UpdateFields();
    }

    async ConnectWallet() {
        await this.web3modal.connect().then(async (_provider) => {
            if (!this.provider) {
                // If we don't have a provider -> create it and add event listeners
                this.provider = _provider;
                this.provider
                    .on("accountsChanged", async (accounts) => {
                        await this.HandleEvent("accountsChanged", accounts);
                    })
                    .on("chainChanged", async (chainId) => {
                        await this.HandleEvent("chainChanged", chainId);
                    });
            } else {
                // If we have a provider -> update it to the new one
                this.provider = _provider;
            }

            if (this.web3) {
                // Update provider in WEB3
                this.web3.setProvider(this.provider)
            } else {
                // Create a WEB3 if it does not exists
                this.web3 = new Web3(this.provider);
            }

            // Handle connection event
            await this.HandleEvent("connect");
        });
    }

    async ConnectToContract() {
        utils.colorLog(`Connecting to contract ${this.contractObject.address}`, "info");
        if (!this.contractObject.web3contract) {
            try {
                let response = await fetch(this.contractObject.abi_path);
                this.contractObject.abi = await response.json();
                this.contractObject.web3contract = new this.web3.eth.Contract(this.contractObject.abi, this.contractObject.address);
                utils.colorLog(`Successfully connected to ${this.contractObject.address} contract`, "success");
            } catch (e) {
                utils.colorLog(`Connecting to contract ${this.contractObject.address} failed ${e}`, "error");
            }
        } else {
            utils.colorLog('Contract already exists', 'warning');
        }
    }

    async ToggleWalletConnection() {
        if (this.web3modal.cachedProvider) {
            console.log('Disconnecting wallet...');
            await this.web3modal.clearCachedProvider();

            await this.HandleEvent("disconnect")
        } else {
            console.log('Connecting wallet...');
            await this.ConnectWallet();
        }
    }

    // Set user referrer
    GetRef() {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        let url_ref = urlParams.get('ref');
        let cookie_ref = Cookies.get('ref');

        if (cookie_ref) {
            // If ref cookie exists set referrer to cookie's value
            this.userObject.referrer = cookie_ref;
        } else if (url_ref) {
            // If ref cookie DOES NOT exists set referrer to url's value
            Cookies.set('ref', url_ref, {path: '', expires: 2147483647, domain: '.bee-n-bee.io'});
            this.userObject.referrer = url_ref;
        } else {
            // If we don't have any referral data set it to default
            this.userObject.referrer = '0x59FC9Ca77250d189D018eAd70350174E1e98c4B0';
            // Cookies.set('ref', '0x59FC9Ca77250d189D018eAd70350174E1e98c4B0', {path: '', expires: 2147483647});
        }

        // If re referrer of a user is corrupted -> set the referrer to the default
        if (!Web3.utils.isAddress(this.userObject.referrer)) {
            this.userObject.referrer = '0x59FC9Ca77250d189D018eAd70350174E1e98c4B0';
            // Cookies.set('ref', '0x59FC9Ca77250d189D018eAd70350174E1e98c4B0', {path: '', expires: 2147483647});
        }
    }
}



$(document).ready(function () {
    let app = new DApp(
        '0xBB1CCD65fABAdf606C7266E58488E2EFF412A4F4',
        './scripts/abi_v22.json',
        56
    );

    connectWalletButton.click(async () => {
        await app.ToggleWalletConnection();
    });
});




class utils {
    static truncateAddress(address) {
        const match = address.match(
            /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
        );
        if (!match) return address;
        return `${match[1]}…${match[2]}`;
    }

    static colorLog(message, color) {

        color = color || "black";

        switch (color) {
            case "success":
                color = "Green";
                break;
            case "info":
                color = "DodgerBlue";
                break;
            case "error":
                color = "Red";
                break;
            case "warning":
                color = "Orange";
                break;
            default:
                break;
        }

        console.log("%c" + message, "color:" + color);
    }

    static ConvertSecToTime(n) {
        const d = Number(n);
        let hours = Math.floor(d / 3600);
        let minutes = Math.floor(d % 3600 / 60);
        let seconds = Math.floor(d % 3600 % 60);

        return ("0" + Math.floor(hours)).slice(-2) + ":" + ("0" + Math.floor(minutes)).slice(-2) + ":" + ("0" + Math.floor(seconds)).slice(-2);
    }
}