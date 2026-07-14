let editingId = null;



async function loadVehicles(){


    let response =
        await fetch("/api/vehicles");


    let vehicles =
        await response.json();



    let table =
        document.getElementById("vehicleTable");


    table.innerHTML="";



    vehicles.forEach(v => {


        table.innerHTML += `

        <tr>

        <td>${v.id}</td>

        <td>${v.make}</td>

        <td>${v.model}</td>

        <td>${v.year}</td>

        <td>${v.vin}</td>


        <td>


        <button class="edit"
        onclick="editVehicle(
        ${v.id},
        '${v.make}',
        '${v.model}',
        '${v.year}',
        '${v.vin}')">

        Edit

        </button>



        <button class="delete"
        onclick="deleteVehicle(${v.id})">

        Delete

        </button>


        </td>


        </tr>

        `;


    });

}




async function saveVehicle(){


    let vehicle = {


        make:
        document.getElementById("make").value,


        model:
        document.getElementById("model").value,


        year:
        document.getElementById("year").value,


        vin:
        document.getElementById("vin").value

    };



    if(editingId){


        await fetch(
        `/api/vehicles/${editingId}`,
        {

        method:"PUT",

        headers:{
        "Content-Type":"application/json"
        },

        body:
        JSON.stringify(vehicle)

        });


        editingId=null;


    }

    else {


        await fetch(
        "/api/vehicles",
        {

        method:"POST",

        headers:{
        "Content-Type":"application/json"
        },

        body:
        JSON.stringify(vehicle)

        });


    }


    clearForm();

    loadVehicles();

}




function editVehicle(id,makeValue,modelValue,yearValue,vinValue){


    editingId=id;


    document.getElementById("make").value =
        makeValue;


    document.getElementById("model").value =
        modelValue;


    document.getElementById("year").value =
        yearValue;


    document.getElementById("vin").value =
        vinValue;

}




async function deleteVehicle(id){


    await fetch(
    `/api/vehicles/${id}`,
    {

        method:"DELETE"

    });


    loadVehicles();

}




function clearForm(){


    document.getElementById("make").value="";

    document.getElementById("model").value="";

    document.getElementById("year").value="";

    document.getElementById("vin").value="";

}



loadVehicles();