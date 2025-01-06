import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Header from './Header';
import Modal from './Modal';
import {toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';


function Root() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [id, setId] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editPatient, setEditPatient] = useState(null);

    const transformPatientData = (patient) => {
        const { ID, Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address, Email, EmergencyContact, Relationship, EmergencyPhone, CreateDate } = patient;
        return {
            name: Name,
            identifier: Identifier,
            gender: Gender,
            birthdate: Birthdate,
            NNTWN: NNTWN,
            phone: Phone,
            mobile: Mobile,
            address: Address,
            email: Email,
            emergencyContact: EmergencyContact,
            relationship: Relationship,
            emergencyPhone: EmergencyPhone
        };
    };

    const handleDelete = (id) => {
        fetch(`http://localhost:3251/api/patients/${id}`, {
            method: 'DELETE'
        })
            .then(() => {
                console.log('Deleting patient with ID:', id);
                loadPatients();  // 重新加载病人数据
            })
            .catch(error => {
                console.error('Error during deletion:', error);
                setLoading(false);
            });
    };

    const handleHistory = (id) => {
        fetch(`http://localhost:3251/api/patients/history/${id}`)
            .then(response => response.json())
            .then(data => {
                setHistory(data);
                setShowHistory(true);
            })
            .catch(error => {
                console.error('Error fetching patient history:', error);
            });
    };

    const closeModal = () => {
        setShowHistory(false);
        setHistory([]);
        setShowEditModal(false);
        setEditPatient(null);
    };

    const handleSearch = () => {
        if (id) {
            fetch(`http://localhost:3251/api/patients/${id}`)
                .then(response => response.json())
                .then(data => {
                    setSearchResult(data);
                })
                .catch(error => {
                    console.error('Error fetching patient data:', error);
                });
        }
    };

    const handleEdit = (patient) => {
        setEditPatient(patient);
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();

        if (!editPatient || !editPatient.ID) {
            console.error('Invalid patient data:', editPatient);
            return;
        }
        const transformedPatient = transformPatientData(editPatient);

        const { ID } = editPatient;
        console.log(JSON.stringify(transformedPatient));

        fetch(`http://localhost:3251/api/patients/${ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transformedPatient),
        })
            .then(response => response.json())
            .then(data => {
                setPatients(patients.map(patient => (patient.ID === ID ? data : patient)));
                closeModal();
            })
            .catch(error => {
                console.error('Error updating patient data:', error);
            });
    };

    const loadPatients = () => {
        setLoading(true);
        fetch('http://localhost:3251/api/patients')
            .then(response => response.json())
            .then(data => {
                setPatients(data.patients);
                setLoading(false);
                toast.success('Patients data fetched successfully!');
            })
            .catch(error => {
                console.error('Error fetching patient data:', error);
                setLoading(false);
                toast.error('Error fetching patient data');
            });
    };

    useEffect(() => {
        loadPatients();
    }, []);
    return (
        <div className="container mx-auto">
            <Header Id={id} setId={setId} handleSearch={handleSearch} />
            <div className="flex justify-center">
                {loading ? (
                    <div className="flex justify-center items-center">
                        <Icon icon="svg-spinners:blocks-shuffle-2" className="text-3xl animate-spin" />
                    </div>
                ) : (
                    <div className="table-full max-w-full overflow-x-auto">
                        <table className="table-auto">
                            <tbody>
                            <tr className="border-b">
                                <th className="text-left p-3 px-5">ID</th>
                                <th className="text-left p-3 px-5">Name</th>
                                <th className="text-left p-3 px-5">Identifier</th>
                                <th className="text-left p-3 px-5">Gender</th>
                                <th className="text-left p-3 px-5">Birthdate</th>
                                <th className="text-left p-3 px-5">Phone</th>
                                <th className="text-left p-3 px-5">Mobile</th>
                                <th className="text-left p-3 px-5">Address</th>
                                <th className="text-left p-3 px-5">Email</th>
                                <th className="text-left p-3 px-5">Emergency Contact</th>
                                <th className="text-left p-3 px-5">Relationship</th>
                                <th className="text-left p-3 px-5">Emergency Phone</th>
                                <th className="text-left p-3 px-5">Create Date</th>
                                <th className="text-left p-3 px-5">Actions</th>
                            </tr>
                            {searchResult ? (
                                <tr key={searchResult.ID} className="border-b hover:bg-orange-100 bg-gray-100">
                                    <td className="p-3 px-5">{searchResult.ID}</td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Name} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Identifier} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Gender} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={new Date(searchResult.Birthdate).toLocaleDateString()} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Phone} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Mobile} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Address} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Email} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.EmergencyContact} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.Relationship} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={searchResult.EmergencyPhone} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={new Date(searchResult.CreateDate).toLocaleString()} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <button
                                            onClick={() => handleDelete(searchResult.ID)}
                                            className="bg-red-500 text-white px-4 py-2 rounded"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => handleHistory(searchResult.ID)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded"
                                        >
                                            History
                                        </button>
                                        <button
                                            onClick={() => handleEdit(searchResult)}
                                            className="bg-green-500 text-white px-4 py-2 rounded"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ) : patients.map((patient) => (
                                <tr key={patient.ID} className="border-b hover:bg-orange-100 bg-gray-100">
                                    <td className="p-3 px-5">{patient.ID}</td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Name} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Identifier} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Gender} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={new Date(patient.Birthdate).toLocaleDateString()} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Phone} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Mobile} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Address} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Email} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.EmergencyContact} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.Relationship} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={patient.EmergencyPhone} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <input type="text" value={new Date(patient.CreateDate).toLocaleString()} className="bg-transparent border-b-2 border-gray-300 py-2" readOnly />
                                    </td>
                                    <td className="p-3 px-5">
                                        <button
                                            onClick={() => handleDelete(patient.ID)}
                                            className="bg-red-500 text-white px-4 py-2 rounded"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => handleHistory(patient.ID)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded"
                                        >
                                            History
                                        </button>
                                        <button
                                            onClick={() => handleEdit(patient)}
                                            className="bg-green-500 text-white px-4 py-2 rounded"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <Modal isOpen={showHistory} onClose={closeModal}>
                <h2 className="text-2xl mb-4">Patient History</h2>
                <div className="table-container max-w-full overflow-x-auto">
                    <table className="table-auto w-full mt-4">
                        <thead>
                        <tr className="border-b">
                            <th className="text-left p-3 px-5">History ID</th>
                            <th className="text-left p-3 px-5">Patient ID</th>
                            <th className="text-left p-3 px-5">Name</th>
                            <th className="text-left p-3 px-5">Identifier</th>
                            <th className="text-left p-3 px-5">Gender</th>
                            <th className="text-left p-3 px-5">Birthdate</th>
                            <th className="text-left p-3 px-5">Phone</th>
                            <th className="text-left p-3 px-5">Mobile</th>
                            <th className="text-left p-3 px-5">Address</th>
                            <th className="text-left p-3 px-5">Email</th>
                            <th className="text-left p-3 px-5">Emergency Contact</th>
                            <th className="text-left p-3 px-5">Relationship</th>
                            <th className="text-left p-3 px-5">Emergency Phone</th>
                            <th className="text-left p-3 px-5">Edit Date</th>
                            <th className="text-left p-3 px-5">Operation Type</th>
                        </tr>
                        </thead>
                        <tbody>
                        {history.map(entry => (
                            <tr key={entry.HistoryID} className="border-b hover:bg-orange-100 bg-gray-100">
                                <td className="p-3 px-5">{entry.HistoryID}</td>
                                <td className="p-3 px-5">{entry.PatientID}</td>
                                <td className="p-3 px-5">{entry.Name}</td>
                                <td className="p-3 px-5">{entry.Identifier}</td>
                                <td className="p-3 px-5">{entry.Gender}</td>
                                <td className="p-3 px-5">{new Date(entry.Birthdate).toLocaleDateString()}</td>
                                <td className="p-3 px-5">{entry.Phone}</td>
                                <td className="p-3 px-5">{entry.Mobile}</td>
                                <td className="p-3 px-5">{entry.Address}</td>
                                <td className="p-3 px-5">{entry.Email}</td>
                                <td className="p-3 px-5">{entry.EmergencyContact}</td>
                                <td className="p-3 px-5">{entry.Relationship}</td>
                                <td className="p-3 px-5">{entry.EmergencyPhone}</td>
                                <td className="p-3 px-5">{new Date(entry.EditDate).toLocaleString()}</td>
                                <td className="p-3 px-5">{entry.OperationType}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
            <Modal isOpen={showEditModal} onClose={closeModal}>
                <h2 className="text-2xl mb-4">Edit Patient</h2>
                <form onSubmit={handleEditSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label>Name:</label>
                            <input type="text" value={editPatient?.Name} onChange={(e) => setEditPatient({ ...editPatient, Name: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Identifier:</label>
                            <input type="text" value={editPatient?.Identifier} onChange={(e) => setEditPatient({ ...editPatient, Identifier: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Gender:</label>
                            <input type="text" value={editPatient?.Gender} onChange={(e) => setEditPatient({ ...editPatient, Gender: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Birthdate:</label>
                            <input type="date" value={editPatient ? new Date(editPatient.Birthdate).toISOString().split('T')[0] : ''} onChange={(e) => setEditPatient({ ...editPatient, Birthdate: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Phone:</label>
                            <input type="text" value={editPatient?.Phone} onChange={(e) => setEditPatient({ ...editPatient, Phone: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Mobile:</label>
                            <input type="text" value={editPatient?.Mobile} onChange={(e) => setEditPatient({ ...editPatient, Mobile: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Address:</label>
                            <input type="text" value={editPatient?.Address} onChange={(e) => setEditPatient({ ...editPatient, Address: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Email:</label>
                            <input type="email" value={editPatient?.Email} onChange={(e) => setEditPatient({ ...editPatient, Email: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Emergency Contact:</label>
                            <input type="text" value={editPatient?.EmergencyContact} onChange={(e) => setEditPatient({ ...editPatient, EmergencyContact: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Relationship:</label>
                            <input type="text" value={editPatient?.Relationship} onChange={(e) => setEditPatient({ ...editPatient, Relationship: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                        <div>
                            <label>Emergency Phone:</label>
                            <input type="text" value={editPatient?.EmergencyPhone} onChange={(e) => setEditPatient({ ...editPatient, EmergencyPhone: e.target.value })} className="border p-2 rounded w-full" />
                        </div>
                    </div>
                    <button type="submit" className="bg-green-500 text-white px-4 py-2 mt-4 rounded">Save</button>
                    <button type="button" onClick={closeModal} className="bg-red-500 text-white px-4 py-2 mt-4 ml-4 rounded">Cancel</button>
                </form>
            </Modal>
        </div>
    );
}

export default Root;
