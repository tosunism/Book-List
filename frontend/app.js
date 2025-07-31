import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabase = createClient(
    'https://iurqiqsczhfsmtpcbhjh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cnFpcXNjemhmc210cGNiaGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzAxMTksImV4cCI6MjA2ODAwNjExOX0._hjKaRNKy7eUFzOT318nrIr3976_X7Uki0ahGB-Nxmg'
)

const submitBtn = document.querySelector(".sub-btn")
const bookInput = document.querySelector("#input-box")
const bookList = document.querySelector(".book-list")
const bookListTitle = document.getElementById("list-title")
const bookForm = document.querySelector(".book-form")
const msgTxt = document.querySelector(".message")
const clrBtn = document.querySelector(".clr-btn")
const openFileBtn = document.getElementById("openBtn")
const saveAsBtn = document.getElementById("saveAsBtn")
const myListsBtn = document.getElementById("myListsBtn")
const listContainer = document.querySelector(".list-container")

let showListContainer = false
const toggleListContainer = () => {
    if (showListContainer) {
        listContainer.style.display = "none"
    } else {
        listContainer.style.display = "block"
    }
    showListContainer = !showListContainer
}

let currentList = 'Book List'
let listQuery = `?list=${encodeURIComponent(currentList)}`
let http = "http://localhost:3000"

openFileBtn.addEventListener("click", async () => {
    await setListName()
    await loadBooks()
    bookListTitle.innerText = currentList
})

myListsBtn.addEventListener("click", async () => {
    const response = await fetch(`${http}/mylists`)
    const lists = await response.json()    
    listContainer.innerHTML = ""
    lists.forEach((list) => {
        const listItem = document.createElement("div")
        listItem.classList.add("list-item")
        const nameSpan = document.createElement("span")
        nameSpan.innerText = list
        listItem.appendChild(nameSpan)

        const deleteListBtn = document.createElement("button")
        deleteListBtn.type = "button"
        deleteListBtn.innerHTML = `<i class="fas fa-trash"></i> DELETE LIST`
        deleteListBtn.classList.add("del-btn")
        deleteListBtn.addEventListener("click", async (v) => {            
            v.stopPropagation()
            if (!confirm(`Delete "${list}"?`)) {
                return
            }
            const response = await fetch(`${http}/deletelist`, {
                method: "DELETE",
                headers: {'content-type':'text/plain'},
                body: list
            })
            const text = await response.text()
            console.log(text)
            if (response.ok) {
                msgTxt.innerHTML = "List deleted"
                msgTxt.classList.add("message-success")
                setTimeout(() => {
                    msgTxt.innerHTML = ""
                    msgTxt.classList.remove("message-success")
                }, 1500)
                await loadBooks()
            } else {
                msgTxt.innerHTML = "Error deleting list"
                msgTxt.classList.add("message-danger")
                setTimeout(() => {
                    msgTxt.innerHTML = ""
                    msgTxt.classList.remove("message-danger")
                }, 1500)
            }
        })
        listItem.appendChild(deleteListBtn)
        listItem.addEventListener("click", async () => {
            currentList = list
            listQuery = listQuery = `?list=${encodeURIComponent(currentList)}`
            bookListTitle.innerText = currentList
            await loadBooks()
            // setTimeout(() => {
            //     listContainer.style.display = "none", 1500
            // })
        })
        listContainer.appendChild(listItem)
    })
    // listContainer.style.display = "block"
    toggleListContainer()
})

saveAsBtn.addEventListener("click", async () => {
    const oldListName = currentList
    await setListName()
    const newListName = currentList
    const response = await fetch(`${http}/saveas${listQuery}`, {
        method : "POST",
        headers : {'content-type' : 'application/json'},
        body : JSON.stringify({oldListName, newListName})
    })
    if (response.ok) {
        msgTxt.innerHTML = "List saved"
        msgTxt.classList.add("message-success")
        await loadBooks()
        bookListTitle.innerText = currentList
    } else {
        msgTxt.innerHTML = "Save failed"
        msgTxt.classList.add("message-danger")
    }
    setTimeout(() => {
        msgTxt.innerHTML = ""
        msgTxt.classList.remove("message-success", "message-danger")
    }, 1500)
})

let edit_case = false
let oldBookName = ""
window.onload = loadBooks

bookForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const book = bookInput.value.trim()
    if (edit_case) {
        bookInput.value = ""
        await fetch(`${http}/edit${listQuery}`, {
            method : "PUT",
            headers : {
                "content-type" : "text/plain"
            },
            body : JSON.stringify({oldName : oldBookName, newName : book})
        })        
        edit_case = false
        submitBtn.innerHTML = "add"
        bookInput.value = ""
        oldBookName = ""
        await loadBooks()
        return
    }
    
    if (book) {
        await fetch(`${http}/save${listQuery}`, {
            method : "POST",
            headers : {
                "content-type" : "text/plain"
            },
            body : book
        })    
        bookInput.value = ""
        await loadBooks()
    } else {
        msgTxt.innerHTML = "No name"
        msgTxt.classList.add("message-danger")
        setTimeout(() => {
            msgTxt.innerHTML = ""
            msgTxt.classList.remove("message-danger")
        }, 1000)
    }
})

clrBtn.addEventListener("click", clearTheList)

async function loadBooks() {
    const response = await fetch(`${http}/books${listQuery}`)    
    const bookArray = await response.json()
    bookList.innerHTML = ""
    bookArray.forEach((book) => {     
        const article = document.createElement("article")
        article.classList.add("book-item")
        article.innerHTML = `<p class="title">${book}</p>
<div class="btn-container">
    <button type="button" class="ed-btn">
        <i class="fas fa-edit"></i>
    </button>
    <button type="button" class="del-btn">
        <i class="fas fa-trash"></i>
    </button>
</div>`
        const edBtn = article.querySelector(".ed-btn")
        const delBtn = article.querySelector(".del-btn")
        edBtn.addEventListener("click", editBook)
        delBtn.addEventListener("click", () => {deleteBook(article)})
        bookList.appendChild(article)
    })    
}

async function editBook(v) {    
    edit_case = true
    submitBtn.innerHTML = "edit"
    bookInput.value = v.currentTarget.parentElement.previousElementSibling.innerHTML
    oldBookName = bookInput.value    
}

async function deleteBook(bookToDelete) {   
    const inBook = bookToDelete.firstElementChild.innerHTML        
    const response = await fetch(`${http}/delete${listQuery}`, {
        method: 'DELETE',
        headers: {
            'content-type':'text/plain'
        },
        body : bookToDelete.firstElementChild.innerHTML
    })        
    if (response) {              
        loadBooks()
    }   
}

async function clearTheList() {
    const response = await fetch(`${http}/clear${listQuery}`, {
        method: 'DELETE',
        headers: {
            'content-type' : 'text/plain'
        },
        body : "Clear the book list"
    })
    if (response) {
        loadBooks()
    }
}

async function setListName() {
    const listName = prompt("List name: ")
    if (listName && listName.trim() !== "") {
        currentList = listName.trim()
        listQuery = `?list=${encodeURIComponent(listName)}`        
    }    
}

async function signUp(email, password) {
    const {user, error} = await supabase.auth.signUp({email: email, password: password})
    if (error) return alert("Error:" + error.message)
    alert("Check your email to confirm account!")    
}
async function signIn(email, password) {
    const {user, session, error} = await supabase.auth.signInWithPassword({ email: email, password: password})
    if (error) return alert("Login failed: " + error.message)
    const token = session.access_token
    localStorage.setItem("supabase_token", token)
    alert("Logged in!")  
}

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("regBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("auth-email")
const passwordInput = document.getElementById("auth-password");

loginBtn.addEventListener("click", async () => {
    const email = emailInput.value
    const password = passwordInput.value
    const { user, error } = await supabase.auth.signInWithPassword(email, password)
    if (error) {alert("Login failed" + error.message)}
    else {
        alert ("Logged in as" + user.email)
        afterLogin()
    }
})

registerBtn.addEventListener("click", async () => {
    const email = emailInput.value
    const password = passwordInput.value
    const {user, error} = await supabase.auth.signUp({email, password})
    if (error) {alert("Failed to register" + error.message)}
    else {
        alert("Check your email to confirm")
    }
})

logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut()
    alert("Logged out")
    location.reload
})

async function afterLogin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    logoutBtn.style.display = "inline";
    currentList = user.email + "'s List";
    listQuery = `?list=${encodeURIComponent(currentList)}`;
    bookListTitle.innerText = currentList;
    await loadBooks();
  }
}

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    afterLogin();
  }
});
