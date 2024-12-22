library;

pub enum MintError {
    CannotMintMoreThanOneNFTWithSubId: (),
    MaxNFTsMinted: (),
    NFTAlreadyMinted: (),
    IncorrectAnswer: (),
}

pub enum SetError {
    ValueAlreadySet: (),
}