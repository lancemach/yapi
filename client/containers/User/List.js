import React, { PureComponent as Component } from 'react';
import { formatTime } from '../../common.js';
import { Link } from 'react-router-dom';
import { setBreadcrumb } from '../../reducer/modules/user';
//import PropTypes from 'prop-types'
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Table, Popconfirm, message, Input } from 'antd';
import axios from 'axios';

const Search = Input.Search;
const limit = 20;
@connect(
  state => {
    return {
      curUserRole: state.user.role
    };
  },
  {
    setBreadcrumb
  }
)
class List extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      total: null,
      current: 1,
      backups: [],
      isSearch: false
    };
  }
  static propTypes = {
    setBreadcrumb: PropTypes.func,
    curUserRole: PropTypes.string
  };
  changePage = current => {
    this.setState(
      {
        current: current
      },
      this.getUserList
    );
  };

  addUser = () => {
    const { email: email, password: password, username: username } = this.state;
    if (!email || !password || !username) {
      message.success('字段均不能为空');
      return false;
    }
    axios.post('/api/user/add', { email, password, username }).then(res => {
      if (res.data.errcode === 0) {
        message.success('添加成功');
        this.getUserList();
        this.setState({
          addUserVisible: false
        });
      } else {
        message.error(res.data.errmsg);
      }
    });
  };

  getUserList() {
    axios.get('/api/user/list?page=' + this.state.current + '&limit=' + limit).then(res => {
      let result = res.data;

      if (result.errcode === 0) {
        let list = result.data.list;
        let total = result.data.count;
        list.map((item, index) => {
          item.key = index;
          item.up_time = formatTime(item.up_time);
        });
        this.setState({
          data: list,
          total: total,
          backups: list
        });
      }
    });
  }

  componentDidMount() {
    this.getUserList();
  }

  confirm = uid => {
    axios
      .post('/api/user/del', {
        id: uid
      })
      .then(
        res => {
          if (res.data.errcode === 0) {
            message.success('已删除此用户');
            let userlist = this.state.data;
            userlist = userlist.filter(item => {
              return item._id != uid;
            });
            this.setState({
              data: userlist
            });
          } else {
            message.error(res.data.errmsg);
          }
        },
        err => {
          message.error(err.message);
        }
      );
  };

  async componentWillMount() {
    this.props.setBreadcrumb([{ name: '用户管理' }]);
  }

  handleSearch = value => {
    let params = { q: value };
    if (params.q !== '') {
      axios.get('/api/user/search', { params }).then(data => {
        let userList = [];

        data = data.data.data;
        if (data) {
          data.forEach(v =>
            userList.push({
              ...v,
              _id: v.uid
            })
          );
        }

        this.setState({
          data: userList,
          isSearch: true
        });
      });
    } else {
      this.setState({
        data: this.state.backups,
        isSearch: false
      });
    }
  };

  render() {
    const role = this.props.curUserRole;
    let data = [];
    if (role === 'admin') {
      data = this.state.data;
    }
    let columns = [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        width: 180,
        render: (username, item) => {
          return <Link to={'/user/profile/' + item._id}>{item.username}</Link>;
        }
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email'
      },
      {
        title: '用户角色',
        dataIndex: 'role',
        key: 'role',
        width: 150
      },
      {
        title: '更新日期',
        dataIndex: 'up_time',
        key: 'up_time',
        width: 160
      },
      {
        title: '功能',
        key: 'action',
        width: '90px',
        render: item => {
          return (
            <span>
              {/* <span className="ant-divider" /> */}
              <Popconfirm
                title='确认删除此用户?'
                onConfirm={() => {
                  this.confirm(item._id);
                }}
                okText='确定'
                cancelText='取消'
              >
                <a style={{ display: 'block', textAlign: 'center' }} href='#'>
                  删除
                </a>
              </Popconfirm>
            </span>
          );
        }
      }
    ];

    columns = columns.filter(item => {
      if (item.key === 'action' && role !== 'admin') {
        return false;
      }
      return true;
    });

    const pageConfig = {
      total: this.state.total,
      pageSize: limit,
      current: this.state.current,
      onChange: this.changePage
    };

    const defaultPageConfig = {
      total: this.state.data.length,
      pageSize: limit,
      current: 1
    };

    return (
      <section className='user-table'>
        <div className='user-search-wrapper'>
          <div style={{ marginBottom: '10px' }}>
            <Button type='primary' onClick={() => this.setState({ addUserVisible: true })}>
              添加用户
            </Button>
          </div>
          <h2 style={{ marginBottom: '10px' }}>用户总数：{this.state.total}位</h2>
          <Search
            onChange={e => this.handleSearch(e.target.value)}
            onSearch={this.handleSearch}
            placeholder='请输入用户名'
          />
        </div>
        <Table
          bordered={true}
          rowKey={record => record._id}
          columns={columns}
          pagination={this.state.isSearch ? defaultPageConfig : pageConfig}
          dataSource={data}
        />
        <Modal
          title='添加用户'
          visible={this.state.addUserVisible}
          onOk={this.addUser}
          onCancel={() =>
            this.setState({ addUserVisible: false, email: '', password: '', username: '' })
          }
          className='add-group-modal'
        >
          <Row gutter={6} className='modal-input'>
            <Col span='5'>
              <div className='label'>Email：</div>
            </Col>
            <Col span='15'>
              <Input
                placeholder='请输入邮箱'
                onChange={e => this.setState({ email: e.target.value })}
              />
            </Col>
          </Row>
          <Row gutter={6} className='modal-input'>
            <Col span='5'>
              <div className='label'>密码：</div>
            </Col>
            <Col span='15'>
              <Input
                placeholder='请输入密码'
                type='password'
                onChange={e => this.setState({ password: e.target.value })}
              />
            </Col>
          </Row>
          <Row gutter={6} className='modal-input'>
            <Col span='5'>
              <div className='label'>用户名：</div>
            </Col>
            <Col span='15'>
              <Input
                placeholder='用户名'
                onChange={e => this.setState({ username: e.target.value })}
              />
            </Col>
          </Row>
        </Modal>
      </section>
    );
  }
}

export default List;
