import "../../assets/styles/_chatModal.scss";
import ChatRoom from "./ChatRoom";
import { useState, useEffect, useRef } from "react";
import { CompatClient, Stomp } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { wouteAPI } from "../../api";

export default function ChatModal({user, setChatNoti}) {
  const [chatList, setChatList] = useState([])
  const [connected, setConnected] = useState(false)
  // 채팅대상 검색
  const [searchListVisible, setSearchListVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('')
  const [receiveMessage, setReceiveMessage] = useState([])
  const [roomNick, setRoomNick] = useState('')
  const [roomProfileImg, setRoomProfileImg] = useState('')
  const [myInfo, setMyInfo] = useState('')
  const [messageInput, setMessageInput] = useState([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentRoomId, setCurrentRoomId] = useState('')
  const location = useLocation()
  
  const state = location.state && location.state?.backgroundLocation
  const idx = location.pathname.lastIndexOf('/')
  const checkId = location.pathname.substring(idx + 1)
  
  const stompClient = useRef({});
  // const url = 'http://localhost:8081/ws'
  const url = 'http://3.36.219.193:8081/ws'

  let fromPageRoomId = null;
  if (location.state.userId != undefined && user.id != null) {
    if(location.state.roomId == null) {
      fromPageRoomId = user.id.toString() + location.state.userId.toString()
    } else {
      fromPageRoomId = location.state.roomId
    }
  }
  
  useEffect(() => {
    const socket = new SockJS(url)
    stompClient.current = Stomp.over(socket)  
    // WebSocket 연결
      stompClient.current.connect({}, () => {
        console.log('connect 성공');
        setConnected(true)
          // 해당 채팅방 구독
          stompClient.current.subscribe(
            `/sub/chat/m/${fromPageRoomId != null && currentRoomId == '' ?
            fromPageRoomId : currentRoomId}`,
            (frame) => {
              let msg = JSON.parse(frame.body)
              console.log(msg);
              setReceiveMessage(msg)},
            {},
          );
        // }

      })
      return () => {
        stompClient.current.disconnect()
        setConnected(false)
      }
  },[location.pathname, receiveMessage])

  // 안읽은 채팅방 읽음처리
  const readNoti = async(id) => {
    try {
      await wouteAPI(`/chat/${user.id}/read`, 'POST', {roomId:id})
    } catch (error) {
      
    }
  }

  useEffect(() => {
    if(stompClient.current.connected) {
      readNoti(fromPageRoomId || currentRoomId)
    }
  },[receiveMessage])

  // 채팅방 선택 
  const selectRoom = (e) => {
    const toUserId = e.currentTarget.querySelector('.userId').value;
    const roomId = e.currentTarget.querySelector('.roomId').value;
    const nick = e.currentTarget.querySelector('.tab-nick h2').textContent;
    const img = e.currentTarget.querySelector('.profileImg img').src;
    readNoti(roomId)
    setRoomNick(nick)
    setRoomProfileImg(img)
    setCurrentUserId(toUserId)
    setCurrentRoomId(roomId)
  }

  

  // 메시지 전송
  const sendMessage = () => {
    // 유저페이지에서 메시지 보내기로 왔을때
  if(location.state.userId == checkId) {
    console.log('보낼때 id :' +location.state.userId);
    console.log('보낼때 roomId :' + fromPageRoomId);
    const newMessage = {
      myId: user.id,
      toUserId: location.state.userId,
      roomId: fromPageRoomId,
      message: messageInput
    }
    stompClient.current.publish({destination: `/pub/chat/m`, body: JSON.stringify({newMessage
    })});
    setMessageInput('')
  }
  stompClient.current.publish({destination: `/pub/chat/m`, body: JSON.stringify({message
  })});
  setMessageInput('')
};

// 전송할 메시지
let message = {
  myId: user.id,
  toUserId: currentUserId,
  roomId: currentRoomId,
  message: messageInput
}

  const sendEnter = (e) => {
    if(e.key === 'Enter') {
      sendMessage()
    }
  }
  
  // 채팅방 리스트 조회
  const chatInfo = async () => {
    const response = await wouteAPI(`/chat/${user.id}`, 'GET');
    // console.log(response.data.myUser); 
    // console.log(response.data.rooms); 
    setMyInfo(response.data.myUser)
    setChatList(response.data.rooms.reverse())
  }
  // 안읽은 채팅방 개수
  const unReadCount =  chatList.reduce((count, room) => count + (room.isRead ? 0 : 1), 0);
  if(unReadCount > 0) {
    setChatNoti(true)
  } else {
    setChatNoti(false)
  }

  useEffect(() => {
    chatInfo()
  },[receiveMessage, setChatNoti, connected])

  
  // 채팅 유저 검색
  // const search = async () => {
  //   const response = await wouteAPI('/chat/user/', 'POST', {id : 1})
  //   console.log(response.data);
  // }

  const showSearchList = () => {
      setSearchListVisible(!searchListVisible)
  }
  
  const searchResult = e => {
      if(e.key === 'Enter') {
          setSearchListVisible(true)
      }
  }

  return (
    <>
      <div className="modal">
        <div className="inner">
          <div className="chat-inner">
            <div className="chat-util">
              <div className="chat-profile">
                <div className="profile-wrap">
                  <div className="profileImg">
                    <img
                      src={`${process.env.REACT_APP_IMAGE_PATH}${myInfo.profileImage}`}
                      alt="내 프로필"
                    />
                  </div>
                </div>
                <h2>{myInfo.nickname}</h2>
              </div>
              {/* <div className="chat-header">
                <div className="name">
                  <span>메시지</span>
                </div>
                <div className="search-wrap">
                    <div className="user-search">
                        <div className="search-input">
                            <input type="text" onKeyDown={searchResult}/>
                        </div>
                    </div>
                </div>
                <button className="user-btn"></button>
              </div> */}
                <div className={`search-list-wrap ${!searchListVisible ? 'd-none': ''}`}>
                    <div className="search-list-box">
                        <div className="list-header-wrap">
                            <div className="list-header">
                                <div className="title">유저목록</div>
                                <div className="exit-btn">
                                    <button onClick={showSearchList}></button>
                                </div>
                            </div>
                        </div>
                        <div className="search-list">
                            <div className="user-tab">
                                <div className="profileImg">
                                    <img
                                    src="data:image/jpeg;base64,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"
                                    alt="상대 프로필"
                                    />
                                </div>
                                <div className="profileInfo">
                                    <div className="tab-nick">
                                        <h2>닉네임</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="user-tab">
                                <div className="profileImg">
                                    <img
                                    src="data:image/jpeg;base64,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"
                                    alt="상대 프로필"
                                    />
                                </div>
                                <div className="profileInfo">
                                    <div className="tab-nick">
                                        <h2>닉네임</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              <div className="chatRoom-list">
                {chatList.map(item => (
                  <NavLink to={`${user.id}/m/` + item.toUserId} 
                  className="chat-tab"  
                  onClick={selectRoom}
                  state={{ backgroundLocation: state, roomId : item.roomId}} 
                  key={item.roomId}
                  >
                    <input type="text" className="userId" value={item.toUserId} hidden readOnly />
                    <input type="text" className="roomId" value={item.roomId} hidden readOnly />
                    <div className="profileImg">
                      <img src={`${process.env.REACT_APP_IMAGE_PATH}${item.toUserImg}`}/>
                    </div>
                    <div className="profileInfo">
                      <div className="tab-nick">
                        <h2>{item.toUserNick}</h2>
                      </div>
                      <div className="tab-last">{item.lastMsg}</div>
                    </div>
                    <div className="chat-noti">
                      <div>
                          {
                            item.isRead ?
                            <div></div>
                            :
                            <div className="noti-dot"></div>
                          }
                      </div>
                    </div>
                  </NavLink>
                ))}
              </div>
            </div>
            {
              location.pathname === `/chat/${user.id}` ? 
              (<div className="chat-room"></div>)
              : (
                <div className="chat-room">
                  <div className="chat-receiver">
                    <div className="profileImg">
                      {currentRoomId == '' ? (
                      <img src={`${process.env.REACT_APP_IMAGE_PATH}${location.state.profileImg}`} />
                      ) : (
                      <img
                        src={roomProfileImg}
                        alt="상대 프로필"
                      />
                      )}
                    </div>
                    <div className="nick">
                      <h2>{location.state.nickName ? location.state.nickName : roomNick}</h2>
                    </div>
                  </div>
                  <div className="chat-service">
                    <div className="chat-log">
                      <div className="logList-wrap">
                          {/* <Routes>
                            <Route path={`/chat/${user.id}/m/${currentUserId}`}  element={<ChatRoom user={user} data={receiveMessage}/>}/> 
                          </Routes> */}
                          <Outlet context={{receiveMessage, fromPageRoomId, sendMessage, setMessageInput, messageInput}} />
                      </div>
                    </div>
                    <div className="chat-submit">
                      <div className="input-box">
                        <div className="chat-input">
                          <input type="text" 
                          onChange={(e) => setMessageInput(e.target.value)}
                          value={messageInput}
                          placeholder="메시지 입력" 
                          onKeyDown={sendEnter}
                          />
                        </div>
                        <div className="submit-btn">
                            <button 
                            onClick={sendMessage}
                            ></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )
              }
          </div>
          <Link to={ state } className='close'>닫기</Link>
        </div>
      </div>
    </>
  );
}
