pragma solidity 0.4.19;

/**
 * AddressList - decorates address[]
 *
 * Adds basic list like functionalities 
 */
library AddressList {

    /**
     * Find the first index of `_value` or return -1
     *
     * @param self Copy of the decorated address[]
     * @return int First index of `_value`
     */
    function indexOf(address[] storage self, address _value) public view returns (int) {
        int response = int(-1);
        for (uint i = 0; i < self.length; i++) {
            if (self[i] == _value) {
                response = int(i);
                break;
            }
        }

        return response;
    }


    /**
     * Find the last index of `_value` or return -1
     *
     * @param self Copy of the decorated address[]
     * @return int Last index of `_value`
     */
    function lastIndexOf(address[] storage self, address _value) public view returns (int) {
        int response = int(-1);
        for (uint i = self.length - 1; i >= 0; i--) {
            if (self[i] == _value) {
                response = int(i);
                break;
            }
        }

        return response;
    }
}