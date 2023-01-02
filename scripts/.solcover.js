module.exports = {
    skipFiles: ['Marketplace.sol', 'Token.sol', 'helper/BasicMetaTransaction.sol', 'helper/Mock.sol', 'interfaces/IMaintenanceReserve.sol', 'interfaces/IMOGTOKEN.sol', 'interfaces/IVacancyReserve.sol'],
    modifierWhitelist: ["onlyOwner"]
};