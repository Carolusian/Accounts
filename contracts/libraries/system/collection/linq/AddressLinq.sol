pragma solidity 0.4.19;

/**
 * AddressLinq - Decorates address[]
 *
 * Adds basic linq like functionalities 
 */
library AddressLinq {

    /**
     * Returns true if values in `self` contain duplicates
     *
     * @param self Reference to the decorated address[]
     * @return bool Wheter values in `self` contain duplicates
     */
    function containsDuplicates(address[] self) public pure returns (bool) {
        for (uint i = 0; i < self.length; i++) {
            for (uint j = 0; j < self.length; j++) {
                if (i != j && self[i] == self[j]) {
                    return true;
                }
            }
        }

        return false;
    }


    /**
     * Returns true if `self` contains all values in `_values`
     *
     * @param self Reference to the decorated address[]
     * @param _values Reference to the target address[]
     * @return bool Wheter `self` contains all values in `_values`
     */
    function containsAll(address[] self, address[] _values) public pure returns (bool) {
        for (uint i = 0; i < _values.length; i++) {
            if (!contains(self, _values[i])) {
                return false;
            }
        }

        return true;
    }


    /**
     * Returns true if `self` contains `_value`
     *
     * @param self Reference to the decorated address[]
     * @param _value The target value
     * @return bool Wheter `self` contains `_value`
     */
    function contains(address[] self, address _value) public pure returns (bool) {
        for (uint i = 0; i < self.length; i++) {
            if (_value == self[i]) {
                return true;
            }
        }

        return false;
    }
}