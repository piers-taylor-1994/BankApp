import { useRef, useState, useEffect } from "react";
import { View, StyleSheet, SafeAreaView, Text, Image, Button, Dimensions, AppState, TextInput, Pressable, Modal } from "react-native";
import ReactNativeBiometrics from 'react-native-biometrics'
import EncryptedStorage from 'react-native-encrypted-storage';

function App() {
    const biometrics = useRef(null);
    const appState = useRef(AppState.currentState);

    const [array, setArray] = useState([]);
    const [validated, setValidated] = useState();
    const [showModal, setShowModal] = useState(false);

    const [bank, setBank] = useState("");
    const [name, setName] = useState("");
    const [pin, setPin] = useState("");
    const [cvc, setCvc] = useState("");

    const [cardId, setCardId] = useState(null);

    async function storeData(key, value) {
        try {
            await EncryptedStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.log(error);
        }
    }

    async function getData(key) {
        try {
            const value = await EncryptedStorage.getItem(key);
            if (value !== undefined) {
                return JSON.parse(value);
            }
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                biometrics.current = null;
                setValidated("");
            }

            appState.current = nextAppState;
            console.log('AppState', appState.current);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const rnBiometrics = new ReactNativeBiometrics()

    if (!biometrics.current) {
        rnBiometrics.simplePrompt({ promptMessage: 'Confirm fingerprint' })
            .then((resultObject) => {
                const { success } = resultObject

                if (success) {
                    setValidated(true);
                    getData("data").then((output) => { if (output && output.length > 0) setArray(output) });
                } else {
                    setValidated(false);
                }
            })
            .catch(() => {
                console.log('biometrics failed')
            })
        biometrics.current = true;
    }

    const editCard = (c) => {
        let chosenCard = array.find((card) => card.id === c.id);
        setBank(chosenCard.bank.toLowerCase());
        setName(chosenCard.name);
        setPin(chosenCard.pin);
        setCvc(chosenCard.cvc);
        setCardId(c.id);
        setShowModal(true);
    }

    const toRow = (c) => {
        let imgPath;
        switch (c.bank) {
            case "amex":
                imgPath = require("./images/amex.png");
                break;
            case "natwest":
                imgPath = require("./images/natwest.png");
                break;
            case "hsbc":
                imgPath = require("./images/hsbc.png");
                break;
            case "barclays":
                imgPath = require("./images/barclays.png");
                break;
            case "virgin":
                imgPath = require("./images/virgin.png");
                break;
            case "firstdirect":
                imgPath = require("./images/firstdirect.png");
                break;
            default:
                imgPath = require("./images/bank.png");
                break;
        }
        return (
            <View key={c.id} style={styles.row}>
                <Image style={{ height: 20, width: 20 }} source={imgPath} />
                <Text style={styles.row.text}>{c.name}</Text>
                <View style={{ position: "absolute", left: 185 }}>
                    <Text style={styles.row.text}>{c.cvc}</Text>
                </View>
                <View style={{ position: "absolute", left: 240 }}>
                    <Text style={styles.row.text}>{c.pin}</Text>
                </View>
                <View style={{ position: "absolute", left: 300, width: 50, borderRadius: 50 }}>
                    <Button title="Edit" onPress={() => editCard(c)} />
                </View>
            </View>
        )
    }

    const Headers = validated === false
        ? <></>
        : validated ? <>
            <Text style={styles.row.textBold}>Bank</Text>
            <View style={{ position: "absolute", left: 185 }}>
                <Text style={styles.row.textBold}>CVC</Text>
            </View>
            <View style={{ position: "absolute", left: 240 }}>
                <Text style={styles.row.textBold}>Pin</Text>
            </View>
        </>
            : <></>

    const Cards = validated === false ? <Text style={styles.warning}>Access denied</Text> : validated ? array.map((c) => toRow(c)) : <></>;

    const addRow = () => {
        let newArray = array;
        newArray.unshift({
            id: newArray.length,
            bank: bank.toLowerCase(),
            name: name,
            pin: pin,
            cvc: cvc,
        });
        setArray(newArray);
        storeData("data", newArray);

        setBank("");
        setName("");
        setPin("");
        setCvc("");
        
        setShowModal(!showModal);
    }

    const editRow = () => {
        let newArray = array;
        let objIndex = newArray.findIndex(obj => obj.id == cardId);

        newArray[objIndex].bank = bank;
        newArray[objIndex].name = name;
        newArray[objIndex].pin = pin;
        newArray[objIndex].cvc = cvc;


        storeData("data", newArray);

        setBank("");
        setName("");
        setPin("");
        setCvc("");
        setCardId(null);

        setShowModal(!showModal);
        }

    const deleteRow = () => {
        let newArray = array;
        newArray = newArray.filter(obj => obj.id !== cardId);

        setArray(newArray);
        storeData("data", newArray);

        setBank("");
        setName("");
        setPin("");
        setCvc("");
        setCardId(null);

        setShowModal(!showModal);
    }

    const modal = <Modal animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => {
            Alert.alert('Modal has been closed.');
            setShowModal(!showModal);
        }}>
        <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <View style={styles.inputView}>
                    <Text style={styles.modalHeader}>{cardId !== null ? "Edit card" : "Add card"}</Text>
                    <TextInput style={styles.input} value={bank} placeholder={"Bank"} onChangeText={setBank} />
                    <TextInput style={styles.input} value={name} placeholder={"Name"} onChangeText={setName} />
                    <TextInput style={styles.input} value={cvc} placeholder={"CVC"} onChangeText={setCvc} />
                    <TextInput style={styles.input} value={pin} placeholder={"Pin"} onChangeText={setPin} />
                </View>
                <View style={{ display: "flex", flexDirection: "row", gap: 15 }}>
                <Pressable
                    style={[styles.button, styles.buttonClose]}
                    onPress={cardId !== null ? editRow : addRow}>
                    <Text style={styles.textStyle}>Submit</Text>
                </Pressable>
                {cardId !== null
                ? <Pressable
                    style={[styles.button, styles.buttonClose, styles.buttonDelete]}
                    onPress={deleteRow}>
                    <Text style={styles.textStyle}>Delete</Text>
                    </Pressable>
                : <></>}

                </View>
            </View>
        </View>
    </Modal>

    return (
        <SafeAreaView style={styles.app}>
            <Text style={styles.header}>Card details</Text>
            <View style={styles.container}>
                {Headers}
                {Cards}
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Add card" onPress={() => setShowModal(true)} />
            </View>
            {modal}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    app: {
        margin: 20,
        height: Dimensions.get('window').height - 50,
        color: "white"
    },
    header: {
        fontSize: 60,
    },
    container: {
        display: "flex",
        gap: 20,
        marginTop: 20,
        marginLeft: 0
    },
    row: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 7.5,

        text: {
            fontSize: 20
        },

        textBold: {
            fontSize: 20,
            fontWeight: "bold"
        }
    },
    warning: {
        fontSize: 30,
        color: "red"
    },
    buttonContainer: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        bottom: 0,
        left: 0,
        right: 0,
    },
    modal: {
        backgroundColor: "rgba(0, 0, 0, .6)",
        height: Dimensions.get('window').height,
        width: Dimensions.get('window').width,
        top: -20,
        left: -20,
        position: "absolute",
        zIndex: 999
    },
    modalMain: {
        backgroundColor: "#4A4A4A",
        position: "absolute",
        padding: 10,
        bottom: 0,
        top: Dimensions.get('window').height / 2 - 40 - 200,
        left: Dimensions.get('window').width / 2 - 40 - 130,
        right: 0,
        height: 400,
        width: 350,
        borderRadius: 20
    },
    input: {
        height: 40,
        width: 150,
        margin: 12,
        borderWidth: 1,
        borderColor: "white",
        padding: 10
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 22,
    },
    modalView: {
        margin: 20,
        backgroundColor: '#4A4A4A',
        color: "black",
        borderRadius: 20,
        padding: 35,
        width: 300,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
    },
    buttonOpen: {
        backgroundColor: '#F194FF',
    },
    buttonClose: {
        backgroundColor: '#2196F3',
    },
    buttonDelete: {
        backgroundColor: '#FF0000',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    },
    modalHeader: {
        fontSize: 30,
        marginBottom: 15,
        textAlign: 'center',
        color: "white"
    },
    inputView: {
        marginBottom: 15,
    }
});

export default App;